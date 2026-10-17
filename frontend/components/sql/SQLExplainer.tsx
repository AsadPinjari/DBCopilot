
"use client";

type ValidationResult = {
  status?: string;
  supported?: boolean;
  findings?: unknown[];
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
  sql: string;
  isExplaining: boolean;
  isConnected: boolean;
  result: SQLExplainResult | null;
  error: string;
  onSQLChange: (value: string) => void;
  onExplain: () => void;
  onCopy: (value: string) => void;
};

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value, null, 2);
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
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

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <h4 className="mb-3 font-semibold text-white">{title}</h4>

      <div className="flex flex-wrap gap-2">
        {validation.status && <StatusBadge value={validation.status} />}

        {typeof validation.supported === "boolean" && (
          <StatusBadge
            value={validation.supported ? "Supported" : "Unsupported"}
          />
        )}
      </div>

      {validation.findings && validation.findings.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-slate-300">Findings</p>

          {validation.findings.map((finding, index) => (
            <pre
              key={index}
              className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-xs text-slate-400"
            >
              {formatValue(finding)}
            </pre>
          ))}
        </div>
      )}

      {Object.entries(validation)
        .filter(
          ([key]) =>
            !["status", "supported", "findings"].includes(key)
        )
        .map(([key, value]) => (
          <div key={key} className="mt-3">
            <p className="text-xs font-medium text-slate-400">{key}</p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-300">
              {formatValue(value)}
            </pre>
          </div>
        ))}
    </div>
  );
}

export default function SQLExplainer({
  sql,
  isExplaining,
  isConnected,
  result,
  error,
  onSQLChange,
  onExplain,
  onCopy,
}: SQLExplainerProps) {
  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="sql-query"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          SQL Query
        </label>

        <textarea
          id="sql-query"
          value={sql}
          onChange={(event) => onSQLChange(event.target.value)}
          placeholder="SELECT * FROM students;"
          rows={6}
          spellCheck={false}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onExplain}
          disabled={!isConnected || isExplaining || !sql.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExplaining ? "Analyzing SQL..." : "Explain & Validate SQL"}
        </button>

        {!isConnected && (
          <p className="text-sm text-amber-300">
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
          <h3 className="text-lg font-semibold text-white">
            SQL Analysis Results
          </h3>

          {result.originalSql && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-300">
                Original SQL
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                {result.originalSql}
              </pre>
            </div>
          )}

          <ValidationCard
            title="Original Query Validation"
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
                <h4 className="font-semibold text-white">Suggested SQL</h4>

                <button
                  type="button"
                  onClick={() => onCopy(result.suggestedSql!)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Copy SQL
                </button>
              </div>

              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-4 font-mono text-sm text-emerald-300">
                {result.suggestedSql}
              </pre>
            </div>
          )}

          <ValidationCard
            title="Suggested Query Validation"
            validation={result.suggestedValidation}
          />

          {!result.originalSql &&
            !result.validation &&
            !result.explanation &&
            !result.reasoning &&
            !result.suggestedSql &&
            !result.suggestedValidation && (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
        </div>
      )}
    </div>
  );
}
