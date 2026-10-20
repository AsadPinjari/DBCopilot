"use client";

import { useMemo } from "react";
import type { WorkspaceView } from "@/components/layout/WorkspaceSidebar";

type SchemaColumn = {
  name?: string;
  columnName?: string;
  type?: string;
  dataType?: string;
  primaryKey?: boolean;
  isPrimaryKey?: boolean;
};

type SchemaTable = {
  name?: string;
  tableName?: string;
  columns?: SchemaColumn[];
};

type ValidationFinding = {
  code?: string;
  message?: string;
  table?: string;
  column?: string;
  alias?: string;
  [key: string]: unknown;
};

type SQLCandidate = {
  sql?: string;
  line?: number;
  validation?: {
    status?: string;
    supported?: boolean;
    findings?: (string | ValidationFinding)[];
  };
};

type AnalysisFile = {
  filePath?: string;
  sqlCandidates?: SQLCandidate[];
};

type AnalysisPayload = {
  summary?: {
    filesProcessed?: number;
    sqlCandidatesFound?: number;
    queriesValidated?: number;
    queriesValid?: number;
    queriesInvalid?: number;
  };
  files?: AnalysisFile[];
  meta?: {
    databaseName?: string;
    timestamp?: string;
  };
};

type SchemaDriftProps = {
  isConnected: boolean;
  tables: SchemaTable[];
  analysis: unknown;
  onNavigate: (view: WorkspaceView) => void;
};

type MissingTableIssue = {
  tableName: string;
  files: { filePath: string; line?: number; sql?: string }[];
};

type MissingColumnIssue = {
  tableName: string;
  columnName: string;
  files: { filePath: string; line?: number; sql?: string }[];
};

export default function SchemaDrift({
  isConnected,
  tables,
  analysis,
  onNavigate,
}: SchemaDriftProps) {
  const analysisData = (analysis as AnalysisPayload) || null;
  const hasAnalysis = Boolean(analysisData && analysisData.files);
  const hasSchema = tables.length > 0;

  // Compute drift metrics
  const driftReport = useMemo(() => {
    if (!hasAnalysis || !analysisData?.files) {
      return null;
    }

    const missingTablesMap = new Map<string, MissingTableIssue>();
    const missingColumnsMap = new Map<string, MissingColumnIssue>();
    const referencedTablesInCode = new Set<string>();

    for (const file of analysisData.files) {
      const filePath = file.filePath ?? "unknown";
      for (const candidate of file.sqlCandidates ?? []) {
        const findings = candidate.validation?.findings ?? [];
        for (const finding of findings) {
          if (!finding || typeof finding !== "object") continue;
          const f = finding as ValidationFinding;

          if (f.code === "TABLE_NOT_FOUND" && f.table) {
            const tbl = f.table.toLowerCase();
            const existing = missingTablesMap.get(tbl) || {
              tableName: f.table,
              files: [],
            };
            existing.files.push({
              filePath,
              line: candidate.line,
              sql: candidate.sql,
            });
            missingTablesMap.set(tbl, existing);
          }

          if (f.code === "COLUMN_NOT_FOUND" && f.column) {
            const key = `${f.table || "unknown"}.${f.column}`.toLowerCase();
            const existing = missingColumnsMap.get(key) || {
              tableName: f.table || "unknown",
              columnName: f.column,
              files: [],
            };
            existing.files.push({
              filePath,
              line: candidate.line,
              sql: candidate.sql,
            });
            missingColumnsMap.set(key, existing);
          }
        }

        // Extract referenced tables from SQL text heuristically if valid
        if (candidate.sql) {
          const fromMatches = candidate.sql.matchAll(
            /\bFROM\s+([`"]?)([a-zA-Z0-9_]+)\1|\bJOIN\s+([`"]?)([a-zA-Z0-9_]+)\3/gi
          );
          for (const match of fromMatches) {
            const t = (match[2] || match[4] || "").toLowerCase();
            if (t) referencedTablesInCode.add(t);
          }
        }
      }
    }

    // Compare with live tables
    const liveTableNames = tables.map((t) =>
      (t.name ?? t.tableName ?? "").toLowerCase()
    );
    const unreferencedLiveTables = tables.filter((t) => {
      const name = (t.name ?? t.tableName ?? "").toLowerCase();
      return name && !referencedTablesInCode.has(name);
    });

    const missingTables = Array.from(missingTablesMap.values());
    const missingColumns = Array.from(missingColumnsMap.values());

    const isSynchronized =
      missingTables.length === 0 && missingColumns.length === 0;

    return {
      missingTables,
      missingColumns,
      referencedCount: referencedTablesInCode.size,
      unreferencedLiveTables,
      isSynchronized,
    };
  }, [analysisData, tables, hasAnalysis]);

  return (
    <div className="space-y-6">
      {/* Prerequisite checklist cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Step 1: Database */}
        <div
          className={`rounded-xl border p-4 transition ${
            isConnected
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. Database
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {isConnected ? "Connected" : "Not connected"}
          </p>
          {!isConnected && (
            <button
              type="button"
              onClick={() => onNavigate("connections")}
              className="mt-3 inline-flex text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Connect database →
            </button>
          )}
        </div>

        {/* Step 2: Schema */}
        <div
          className={`rounded-xl border p-4 transition ${
            hasSchema
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. Schema
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                hasSchema ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {hasSchema
              ? `${tables.length} table${tables.length === 1 ? "" : "s"} loaded`
              : "Schema not loaded"}
          </p>
          {!hasSchema && isConnected && (
            <button
              type="button"
              onClick={() => onNavigate("schema")}
              className="mt-3 inline-flex text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Inspect schema →
            </button>
          )}
        </div>

        {/* Step 3: Codebase */}
        <div
          className={`rounded-xl border p-4 transition ${
            hasAnalysis
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              3. Codebase Analysis
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                hasAnalysis ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {hasAnalysis
              ? `${analysisData?.summary?.queriesValidated ?? 0} queries analyzed`
              : "No project analyzed"}
          </p>
          {!hasAnalysis && (
            <button
              type="button"
              onClick={() => onNavigate("code")}
              className="mt-3 inline-flex text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Upload codebase ZIP →
            </button>
          )}
        </div>
      </div>

      {/* Guide state when missing prerequisites */}
      {(!isConnected || !hasSchema || !hasAnalysis) && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-2xl text-indigo-400">
            ⇄
          </div>
          <h3 className="text-base font-semibold text-white">
            Detect Code ↔ Live Database Drift
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Schema Drift analyzes the disparity between what your application
            code expects and what actually exists in your live database schema.
            Complete the steps above to see missing tables, missing columns,
            and unreferenced database objects.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {!isConnected && (
              <button
                type="button"
                onClick={() => onNavigate("connections")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Connect Database
              </button>
            )}
            {isConnected && !hasSchema && (
              <button
                type="button"
                onClick={() => onNavigate("schema")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Inspect Schema
              </button>
            )}
            {isConnected && hasSchema && !hasAnalysis && (
              <button
                type="button"
                onClick={() => onNavigate("code")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Analyze Project Code
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full Drift Report when both are loaded */}
      {driftReport && (
        <div className="space-y-6">
          {/* Status banner */}
          <div
            className={`rounded-xl border p-5 ${
              driftReport.isSynchronized
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl">
                {driftReport.isSynchronized ? "✓" : "⚠"}
              </span>
              <div>
                <h3
                  className={`text-base font-semibold ${
                    driftReport.isSynchronized
                      ? "text-emerald-300"
                      : "text-red-300"
                  }`}
                >
                  {driftReport.isSynchronized
                    ? "Code and Database Schema are Synchronized"
                    : "Schema Drift Detected Between Code and Database"}
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  {driftReport.isSynchronized
                    ? "All SQL queries in your uploaded project reference tables and columns that exist in the connected database."
                    : `Found ${driftReport.missingTables.length} missing table(s) and ${driftReport.missingColumns.length} missing column(s) referenced by application code.`}
                </p>
              </div>
            </div>
          </div>

          {/* Missing Tables Section */}
          {driftReport.missingTables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">
                  ✕
                </span>
                <h4 className="font-semibold text-white">
                  Tables Referenced in Code, Missing from Database (
                  {driftReport.missingTables.length})
                </h4>
              </div>

              <div className="space-y-2">
                {driftReport.missingTables.map((issue, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-red-500/20 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-red-300">
                        {issue.tableName}
                      </span>
                      <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                        Table not found
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Referenced in {issue.files.length} location(s):
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-300">
                      {issue.files.map((file, fIdx) => (
                        <li
                          key={fIdx}
                          className="font-mono text-slate-400"
                        >
                          {file.filePath}
                          {file.line ? `:${file.line}` : ""}
                          {file.sql && (
                            <span className="ml-2 text-slate-500">
                              ({file.sql.slice(0, 60)}...)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Columns Section */}
          {driftReport.missingColumns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                  !
                </span>
                <h4 className="font-semibold text-white">
                  Columns Referenced in Code, Missing from Table (
                  {driftReport.missingColumns.length})
                </h4>
              </div>

              <div className="space-y-2">
                {driftReport.missingColumns.map((issue, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-500/20 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-amber-300">
                        {issue.tableName}.{issue.columnName}
                      </span>
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                        Column not found
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Referenced in {issue.files.length} location(s):
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-300">
                      {issue.files.map((file, fIdx) => (
                        <li
                          key={fIdx}
                          className="font-mono text-slate-400"
                        >
                          {file.filePath}
                          {file.line ? `:${file.line}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unreferenced Live Tables (Coverage) */}
          {driftReport.unreferencedLiveTables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300">
                  ?
                </span>
                <h4 className="font-semibold text-slate-300">
                  Database Tables Not Referenced in Analyzed Code (
                  {driftReport.unreferencedLiveTables.length})
                </h4>
              </div>

              <div className="flex flex-wrap gap-2">
                {driftReport.unreferencedLiveTables.map((table, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300"
                  >
                    {table.name ?? table.tableName}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                These tables exist in your live database, but were not detected in any
                SELECT queries extracted from the uploaded project archive.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
