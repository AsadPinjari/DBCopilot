
"use client";

import { useState } from "react";

type SQLCandidate = {
  sql?: string;
  line?: number;
  extraction?: string;
  validation?: {
    status?: string;
    supported?: boolean;
    findings?: unknown[];
  };
};

type AnalysisFile = {
  path?: string;
  language?: string;
  databaseRelated?: boolean;
  sqlCandidates?: SQLCandidate[];
};

type AnalysisData = {
  summary?: {
    filesAnalyzed?: number;
    filesWithDatabaseCode?: number;
    sqlCandidatesFound?: number;
    queriesValidated?: number;
    queriesInvalid?: number;
    queriesUnsupported?: number;
  };
  files?: AnalysisFile[];
  [key: string]: unknown;
};

function statusClass(status?: string) {
  const normalized = status?.toLowerCase();

  if (normalized === "valid" || normalized === "success") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }

  if (normalized === "invalid" || normalized === "error") {
    return "border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border-amber-500/30 bg-amber-500/15 text-amber-300";
}

export default function AnalysisDashboard({
  analysis,
}: {
  analysis: unknown;
}) {
  const [showJson, setShowJson] = useState(false);

  const data = (analysis ?? {}) as AnalysisData;
  const summary = data.summary ?? {};
  const files = data.files ?? [];

  const stats = [
    { label: "Files Analyzed", value: summary.filesAnalyzed ?? 0, color: "text-blue-300" },
    { label: "Database Files", value: summary.filesWithDatabaseCode ?? 0, color: "text-violet-300" },
    { label: "SQL Candidates", value: summary.sqlCandidatesFound ?? 0, color: "text-sky-300" },
    { label: "Queries Validated", value: summary.queriesValidated ?? 0, color: "text-emerald-300" },
    { label: "Invalid Queries", value: summary.queriesInvalid ?? 0, color: "text-red-300" },
    { label: "Unsupported Queries", value: summary.queriesUnsupported ?? 0, color: "text-amber-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Analyzed Files</h3>
          <p className="mt-1 text-sm text-slate-400">
            Review the files and SQL queries found in your project.
          </p>
        </div>

        {files.length === 0 && (
          <p className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
            No file details were returned. Inspect the full response below.
          </p>
        )}

        {files.map((file, index) => (
          <div key={`${file.path ?? "file"}-${index}`} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <h4 className="break-all font-semibold text-white">
                  {file.path ?? `File ${index + 1}`}
                </h4>
                <p className="mt-1 text-sm text-slate-400">
                  {file.language ?? "Unknown language"}
                  {file.databaseRelated ? " · Database-related" : ""}
                </p>
              </div>

              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                file.databaseRelated
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  : "border-slate-600 bg-slate-800 text-slate-300"
              }`}>
                {file.databaseRelated ? "Database Code Found" : "File Analyzed"}
              </span>
            </div>

            <div className="space-y-3 px-4 pb-4">
              {(file.sqlCandidates ?? []).map((candidate, queryIndex) => {
                const status = candidate.validation?.status ?? "unknown";
                const findings = candidate.validation?.findings ?? [];

                return (
                  <div key={queryIndex} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-200">SQL Query {queryIndex + 1}</p>
                        {candidate.line != null && (
                          <p className="mt-1 text-xs text-slate-500">Line {candidate.line}</p>
                        )}
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(status)}`}>
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-black/30 p-3 text-sm leading-6 text-slate-200">
                      {candidate.sql ?? "No SQL text extracted."}
                    </pre>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-md px-2 py-1 ${
                        candidate.validation?.supported === true
                          ? "bg-emerald-500/10 text-emerald-300"
                          : candidate.validation?.supported === false
                            ? "bg-red-500/10 text-red-300"
                            : "bg-slate-800 text-slate-400"
                      }`}>
                        {candidate.validation?.supported === true
                          ? "Supported SQL"
                          : candidate.validation?.supported === false
                            ? "Unsupported SQL"
                            : "Support status unavailable"}
                      </span>

                      {candidate.extraction && (
                        <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-400">
                          {candidate.extraction}
                        </span>
                      )}
                    </div>

                    {findings.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <p className="mb-2 text-sm font-medium text-amber-300">
                          Validation Findings
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                          {findings.map((finding, findingIndex) => (
                            <li key={findingIndex} className="break-words">
                              {typeof finding === "string" ? finding : JSON.stringify(finding)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {(file.sqlCandidates ?? []).length === 0 && (
                <p className="rounded-lg bg-slate-950 p-3 text-sm text-slate-400">
                  No SQL candidates were extracted from this file.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={() => setShowJson((current) => !current)}
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
