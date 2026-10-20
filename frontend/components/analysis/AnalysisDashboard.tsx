
"use client";

import { useState } from "react";
import { downloadAnalysisReport } from "@/lib/api";

type ValidationFinding = {
  code?: string;
  message?: string;
  table?: string;
  column?: string;
  alias?: string;
  tables?: string[];
};

type SQLCandidate = {
  sql?: string;
  line?: number;
  extraction?: string;
  validation?: {
    status?: string;
    supported?: boolean;
    findings?: ValidationFinding[];
  };
};

type AnalysisFile = {
  path?: string;
  language?: string;
  databaseRelated?: boolean;
  sqlCandidates?: SQLCandidate[];
};

type AnalysisMeta = {
  timestamp?: string;
  databaseName?: string;
  engine?: string;
};

type AnalysisData = {
  summary?: {
    filesAnalyzed?: number;
    filesWithDatabaseCode?: number;
    sqlCandidatesFound?: number;
    queriesValidated?: number;
    queriesValid?: number;
    queriesInvalid?: number;
    queriesUnsupported?: number;
  };
  meta?: AnalysisMeta;
  files?: AnalysisFile[];
  [key: string]: unknown;
};

function statusClass(status?: string) {
  const n = status?.toLowerCase();
  if (n === "valid") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (n === "invalid" || n === "error") return "border-red-500/30 bg-red-500/15 text-red-300";
  return "border-amber-500/30 bg-amber-500/15 text-amber-300";
}

function findingMessage(finding: ValidationFinding): string {
  if (finding.message) return finding.message;
  switch (finding.code) {
    case "TABLE_NOT_FOUND":
      return `Table '${finding.table ?? "?"}' does not exist in the connected database.`;
    case "COLUMN_NOT_FOUND":
      return finding.table
        ? `Column '${finding.column}' does not exist in table '${finding.table}'.`
        : `Column '${finding.column}' was not found in any table in the query.`;
    case "UNKNOWN_TABLE_ALIAS":
      return `Table alias '${finding.alias ?? finding.table ?? "?"}' is not defined in the FROM clause.`;
    case "AMBIGUOUS_COLUMN":
      return `Column '${finding.column}' is ambiguous — it exists in multiple tables: ${(finding.tables ?? []).join(", ")}.`;
    case "UNSUPPORTED_SQL":
      return "This SQL construct is not supported by the validator.";
    default:
      return JSON.stringify(finding);
  }
}

function findingCodeColor(code?: string): string {
  switch (code) {
    case "TABLE_NOT_FOUND":
    case "COLUMN_NOT_FOUND":
      return "text-red-400";
    case "UNKNOWN_TABLE_ALIAS":
    case "AMBIGUOUS_COLUMN":
      return "text-amber-400";
    case "UNSUPPORTED_SQL":
      return "text-slate-400";
    default:
      return "text-slate-400";
  }
}

export default function AnalysisDashboard({
  analysis,
}: {
  analysis: unknown;
}) {
  const [showJson, setShowJson] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const data = (analysis ?? {}) as AnalysisData;
  const summary = data.summary ?? {};
  const meta = data.meta;
  const files = data.files ?? [];

  function toggleFile(key: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const stats = [
    { label: "Files Analyzed", value: summary.filesAnalyzed ?? 0, color: "text-blue-300" },
    { label: "DB Files", value: summary.filesWithDatabaseCode ?? 0, color: "text-violet-300" },
    { label: "SQL Found", value: summary.sqlCandidatesFound ?? 0, color: "text-sky-300" },
    { label: "Valid", value: summary.queriesValid ?? (summary.queriesValidated ?? 0) - (summary.queriesInvalid ?? 0), color: "text-emerald-300" },
    { label: "Invalid", value: summary.queriesInvalid ?? 0, color: "text-red-300" },
    { label: "Unsupported", value: summary.queriesUnsupported ?? 0, color: "text-amber-300" },
  ];

  return (
    <div className="space-y-5">
      {/* Meta */}
      {meta && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300">
            {meta.engine?.toUpperCase() ?? "DB"} · {meta.databaseName}
          </span>
          {meta.timestamp && (
            <span className="ml-3">
              Analyzed {new Date(meta.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Download button */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Analyzed Files</h3>
        <button
          type="button"
          onClick={() => downloadAnalysisReport(analysis)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          ↓ Download Report
        </button>
      </div>

      {/* File list */}
      <div className="space-y-3">
        {files.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            No database-related files were found in the uploaded archive.
          </p>
        )}

        {files.map((file, fileIndex) => {
          const fileKey = `${file.path ?? "file"}-${fileIndex}`;
          const isExpanded = expandedFiles.has(fileKey);
          const candidates = file.sqlCandidates ?? [];
          const invalidCount = candidates.filter(
            (c) => c.validation?.status === "invalid"
          ).length;

          return (
            <div
              key={fileKey}
              className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
            >
              <button
                type="button"
                onClick={() => toggleFile(fileKey)}
                aria-expanded={isExpanded}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <h4 className="break-all font-mono text-sm font-semibold text-white">
                    {file.path ?? `File ${fileIndex + 1}`}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {file.language?.toUpperCase() ?? "?"}
                    {" · "}
                    {candidates.length} SQL {candidates.length === 1 ? "candidate" : "candidates"}
                    {invalidCount > 0 && (
                      <span className="ml-2 text-red-400">{invalidCount} issue{invalidCount > 1 ? "s" : ""}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {file.databaseRelated && (
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                      DB Code
                    </span>
                  )}
                  <span className="text-slate-400 text-sm">{isExpanded ? "−" : "+"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-3 border-t border-slate-700 p-4">
                  {candidates.length === 0 && (
                    <p className="rounded-lg bg-slate-950 p-3 text-sm text-slate-400">
                      No SQL candidates were extracted from this file.
                    </p>
                  )}

                  {candidates.map((candidate, qi) => {
                    const status = candidate.validation?.status ?? "unknown";
                    const findings = candidate.validation?.findings ?? [];

                    return (
                      <div key={qi} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Line {candidate.line ?? "?"} · {candidate.extraction ?? "extracted"}
                            </p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass(status)}`}>
                            {status.toUpperCase()}
                          </span>
                        </div>

                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-black/30 p-3 font-mono text-xs leading-5 text-slate-200">
                          {candidate.sql ?? "No SQL text extracted."}
                        </pre>

                        {findings.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {findings.map((finding, fi) => (
                              <div key={fi} className="flex items-start gap-2 rounded-lg border border-red-500/15 bg-red-500/5 p-2.5">
                                <span className={`mt-0.5 shrink-0 text-[10px] font-mono font-bold ${findingCodeColor(finding.code)}`}>
                                  {finding.code ?? "ISSUE"}
                                </span>
                                <p className="text-xs leading-5 text-slate-300">
                                  {findingMessage(finding)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {status === "unsupported" && findings.length === 0 && (
                          <p className="mt-2 text-xs text-amber-400">
                            This query type is not supported by the static validator. Review it manually.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw JSON toggle */}
      <div className="overflow-hidden rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={() => setShowJson((c) => !c)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          <span>Full JSON Response</span>
          <span>{showJson ? "− Hide" : "+ Show"}</span>
        </button>

        {showJson && (
          <pre className="max-h-96 overflow-auto border-t border-slate-700 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
