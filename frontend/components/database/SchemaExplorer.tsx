
"use client";

import { useState } from "react";

type SchemaColumn = {
  name?: string;
  columnName?: string;
  type?: string;
  dataType?: string;
  primaryKey?: boolean;
  isPrimaryKey?: boolean;
  foreignKey?: boolean;
  isForeignKey?: boolean;
  nullable?: boolean;
  isNullable?: boolean;
  unique?: boolean;
};

type SchemaRelationship = {
  fromTable?: string;
  fromColumn?: string;
  toTable?: string;
  toColumn?: string;
  sourceTable?: string;
  sourceColumn?: string;
  targetTable?: string;
  targetColumn?: string;
};

type SchemaTable = {
  name?: string;
  tableName?: string;
  columns?: SchemaColumn[];
  relationships?: SchemaRelationship[];
};

type SchemaExplorerProps = {
  tables: SchemaTable[];
  isInspecting: boolean;
  isConnected: boolean;
  error: string;
  onInspect: () => void;
};

export default function SchemaExplorer({
  tables,
  isInspecting,
  isConnected,
  error,
  onInspect,
}: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<string[]>([]);

  function toggleTable(tableName: string) {
    setExpandedTables((current) =>
      current.includes(tableName)
        ? current.filter((name) => name !== tableName)
        : [...current, tableName]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {tables.length} {tables.length === 1 ? "table" : "tables"} detected
        </p>

        <button
          type="button"
          onClick={onInspect}
          disabled={!isConnected || isInspecting}
          className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isInspecting ? "Loading Schema..." : "Inspect Schema"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!isConnected && (
        <p className="text-sm text-amber-300">
          Connect to your database to inspect its schema.
        </p>
      )}

      {isConnected && tables.length === 0 && !isInspecting && !error && (
        <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
          Click “Inspect Schema” to load the database tables.
        </p>
      )}

      {tables.map((table, index) => {
        const tableName = table.name ?? table.tableName ?? `Table ${index + 1}`;
        const columns = table.columns ?? [];
        const expanded = expandedTables.includes(tableName);

        return (
          <div
            key={`${tableName}-${index}`}
            className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
          >
            <button
              type="button"
              onClick={() => toggleTable(tableName)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-800/70"
            >
              <div>
                <p className="font-semibold text-white">{tableName}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {columns.length} column{columns.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-slate-400">{expanded ? "−" : "+"}</span>
            </button>

            {expanded && (
              <div className="border-t border-slate-700 p-4">
                {columns.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="px-3 py-2 font-medium">Column</th>
                          <th className="px-3 py-2 font-medium">Data Type</th>
                          <th className="px-3 py-2 font-medium">Properties</th>
                        </tr>
                      </thead>
                      <tbody>
                        {columns.map((column, columnIndex) => {
                          const columnName =
                            column.name ??
                            column.columnName ??
                            `Column ${columnIndex + 1}`;

                          const properties = [
                            column.primaryKey || column.isPrimaryKey
                              ? "Primary Key"
                              : null,
                            column.foreignKey || column.isForeignKey
                              ? "Foreign Key"
                              : null,
                            column.unique ? "Unique" : null,
                            column.nullable === false ||
                            column.isNullable === false
                              ? "NOT NULL"
                              : null,
                          ].filter(Boolean);

                          return (
                            <tr
                              key={`${columnName}-${columnIndex}`}
                              className="border-b border-slate-800 last:border-0"
                            >
                              <td className="px-3 py-3 font-medium text-slate-200">
                                {columnName}
                              </td>
                              <td className="px-3 py-3 text-slate-400">
                                {column.type ?? column.dataType ?? "Unknown"}
                              </td>
                              <td className="px-3 py-3 text-slate-400">
                                {properties.join(", ") || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No column information was returned for this table.
                  </p>
                )}

                {table.relationships && table.relationships.length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 font-medium text-slate-200">
                      Relationships
                    </h4>
                    <div className="space-y-2">
                      {table.relationships.map((relationship, relationshipIndex) => {
                        const fromTable =
                          relationship.fromTable ??
                          relationship.sourceTable ??
                          tableName;
                        const fromColumn =
                          relationship.fromColumn ??
                          relationship.sourceColumn ??
                          "?";
                        const toTable =
                          relationship.toTable ??
                          relationship.targetTable ??
                          "?";
                        const toColumn =
                          relationship.toColumn ??
                          relationship.targetColumn ??
                          "?";

                        return (
                          <p
                            key={relationshipIndex}
                            className="break-words rounded-lg bg-slate-900 p-3 text-sm text-slate-400"
                          >
                            {fromTable}.{fromColumn} → {toTable}.{toColumn}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
