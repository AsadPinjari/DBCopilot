"use client";

type ValidationFinding = {
  code?: string;
  message?: string;
  table?: string;
  column?: string;
  alias?: string;
  tables?: string[];
  [key: string]: unknown;
};

type ValidationResult = {
  status?: string;
  supported?: boolean;
  findings?: (string | ValidationFinding | unknown)[];
  [key: string]: unknown;
};

type SQLExplainResult = {
  originalSql?: string;
  validation?: ValidationResult;
  explanation?: string;
  reasoning?: string;
  suggestedSql?: string;
  suggestedValidation?: ValidationResult;
  [key: string]: unknown;
};

type SQLExplainerProps = {
  engine?: string;
  sql: string;
  isExplaining: boolean;
  isValidatingOnly?: boolean;
  isConnected: boolean;
  result: SQLExplainResult | null;
  error: string;
  onSQLChange: (value: string) => void;
  onExplain: () => void;
  onValidateOnly?: () => void;
  onCopy: (value: string) => void;
};

function formatFinding(finding: unknown): {
  title: string;
  detail?: string;
  severity: "error" | "warning" | "info";
} {
  if (typeof finding === "string") {
    return { title: finding, severity: "warning" };
  }

  if (!finding || typeof finding !== "object") {
    return { title: String(finding), severity: "info" };
  }

  const f = finding as ValidationFinding;

  if (f.message) {
    return { title: f.message, detail: f.code, severity: "error" };
  }

  if (f.code === "TABLE_NOT_FOUND") {
    return {
      title: `Table "${f.table}" does not exist in schema`,
      detail: f.code,
      severity: "error",
    };
  }

  if (f.code === "COLUMN_NOT_FOUND") {
    return {
      title: `Column "${f.column}" does not exist in table "${f.table}"`,
      detail: f.code,
      severity: "error",
    };
  }

  if (f.code === "ALIAS_NOT_FOUND") {
    return {
      title: `Unknown table alias "${f.alias}"`,
      detail: f.code,
      severity: "error",
    };
  }

  if (f.code === "AMBIGUOUS_COLUMN") {
    const tableList = (f.tables || []).join(", ");
    return {
      title: `Ambiguous column "${f.column}" — present in multiple tables: ${tableList}`,
      detail: f.code,
      severity: "error",
    };
  }

  return { title: JSON.stringify(finding), severity: "info" };
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();

  const style =
    normalized.includes("invalid") ||
    normalized.includes("error") ||
    normalized.includes("unsupported")
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : normalized.includes("valid") ||
          normalized.includes("success") ||
          normalized.includes("supported")
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          normalized.includes("invalid") || normalized.includes("error")
            ? "bg-red-400"
            : normalized.includes("valid") || normalized.includes("success")
              ? "bg-emerald-400"
              : "bg-amber-400"
        }`}
      />
      {value}
    </span>
  );
}

function ValidationCard({
  title,
  validation,
}: {
  title: string;
  validation?: ValidationResult;
}) {
  if (!validation) return null;

  const findings = validation.findings ?? [];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-white">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {validation.status && <StatusBadge value={validation.status} />}
          {typeof validation.supported === "boolean" && (
            <StatusBadge
              value={validation.supported ? "Supported SELECT" : "Unsupported SQL"}
            />
          )}
        </div>
      </div>

      {findings.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Validation Findings ({findings.length})
          </p>

          <div className="space-y-1.5">
            {findings.map((rawFinding, index) => {
              const { title: fTitle, detail, severity } = formatFinding(rawFinding);
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
                    severity === "error"
                      ? "border-red-500/30 bg-red-500/10 text-red-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  <span className="font-bold">
                    {severity === "error" ? "✕" : "⚠"}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{fTitle}</p>
                    {detail && (
                      <span className="mt-1 inline-block rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {detail}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        validation.status === "valid" && (
          <p className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
            ✓ Query passed live schema validation. All referenced tables and columns exist.
          </p>
        )
      )}
    </div>
  );
}

const SQL_SAMPLES = [
  {
    label: "Simple SELECT",
    sql: "SELECT * FROM orders WHERE id = 1;",
  },
  {
    label: "Ambiguous Column",
    sql: "SELECT id FROM users, orders;",
  },
  {
    label: "Nonexistent Table",
    sql: "SELECT * FROM non_existent_table WHERE active = 1;",
  },
  {
    label: "JOIN with Alias",
    sql: "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;",
  },
];

const MONGO_SAMPLES = [
  {
    label: "Find All",
    sql: "db.students.find()",
  },
  {
    label: "Filtered Find",
    sql: "db.students.find({ status: 'active' })",
  },
  {
    label: "Aggregation Pipeline",
    sql: "db.orders.aggregate([ { $match: { status: 'completed' } }, { $group: { _id: '$customer_id', total: { $sum: '$amount' } } } ])",
  },
  {
    label: "Missing Collection",
    sql: "db.nonexistent_collection.find({})",
  },
];

const REDIS_SAMPLES = [
  {
    label: "Safe SCAN",
    sql: "SCAN 0 MATCH user:* COUNT 20",
  },
  {
    label: "Blocking KEYS (Warn)",
    sql: "KEYS user:*",
  },
  {
    label: "HGETALL",
    sql: "HGETALL user:1001",
  },
];

export default function SQLExplainer({
  engine = "mysql",
  sql,
  isExplaining,
  isValidatingOnly = false,
  isConnected,
  result,
  error,
  onSQLChange,
  onExplain,
  onValidateOnly,
  onCopy,
}: SQLExplainerProps) {
  const isBusy = isExplaining || isValidatingOnly;
  const isMongo = engine === "mongodb" || engine === "mongo";
  const isRedis = engine === "redis";

  const samples = isMongo ? MONGO_SAMPLES : isRedis ? REDIS_SAMPLES : SQL_SAMPLES;
  const queryLabel = isMongo
    ? "MongoDB Query / Pipeline"
    : isRedis
    ? "Redis Command"
    : "SQL Query";
  const placeholderText = isMongo
    ? "db.students.find({ status: 'active' })"
    : isRedis
    ? "SCAN 0 MATCH user:* COUNT 20"
    : "SELECT * FROM orders WHERE status = 'completed';";

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="sql-query"
            className="block text-sm font-medium text-slate-300"
          >
            {queryLabel}
          </label>

          {/* Quick sample chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span>Samples:</span>
            {samples.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => onSQLChange(sample.sql)}
                className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500 hover:text-white"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id="sql-query"
          value={sql}
          onChange={(event) => onSQLChange(event.target.value)}
          placeholder={placeholderText}
          rows={5}
          spellCheck={false}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onValidateOnly && (
          <button
            type="button"
            onClick={onValidateOnly}
            disabled={!isConnected || isBusy || !sql.trim()}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidatingOnly ? "Validating Schema..." : "Validate Schema Only"}
          </button>
        )}

        <button
          type="button"
          onClick={onExplain}
          disabled={!isConnected || isBusy || !sql.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExplaining ? "Explaining with AI..." : "Explain & Fix with AI"}
        </button>

        {!isConnected && (
          <p className="text-xs text-amber-300">
            Connect to a database before analyzing SQL.
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 border-t border-slate-800 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              SQL Analysis Results
            </h3>
            {result.explanation ? (
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300">
                AI Explained
              </span>
            ) : (
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                Schema Validator
              </span>
            )}
          </div>

          {result.originalSql && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">
                Query Tested
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                {result.originalSql}
              </pre>
            </div>
          )}

          <ValidationCard
            title="Schema Validation"
            validation={result.validation}
          />

          {result.explanation && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <h4 className="mb-2 font-semibold text-white">Explanation</h4>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {result.explanation}
              </p>
            </div>
          )}

          {result.reasoning && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <h4 className="mb-2 font-semibold text-white">Reasoning</h4>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {result.reasoning}
              </p>
            </div>
          )}

          {result.suggestedSql && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-white">Suggested Correction</h4>

                <button
                  type="button"
                  onClick={() => onCopy(result.suggestedSql!)}
                  className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
                >
                  Copy Suggested SQL
                </button>
              </div>

              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 font-mono text-sm text-emerald-300">
                {result.suggestedSql}
              </pre>
            </div>
          )}

          <ValidationCard
            title="Suggested Query Validation"
            validation={result.suggestedValidation}
          />
        </div>
      )}
    </div>
  );
}
