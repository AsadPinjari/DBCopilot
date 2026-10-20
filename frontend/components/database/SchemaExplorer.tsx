
"use client";

import { useState } from "react";

type SchemaColumn = {
  name?: string;
  columnName?: string;
  type?: string;
  dataType?: string;
  fullType?: string;
  primaryKey?: boolean;
  isPrimaryKey?: boolean;
  foreignKey?: boolean;
  isForeignKey?: boolean;
  nullable?: boolean;
  isNullable?: boolean;
  unique?: boolean;
};

type SchemaRelationship = {
  // New shape from updated backend
  column?: string;
  referencedTable?: string;
  referencedColumn?: string;
  constraintName?: string;
  // Legacy nested shape
  references?: {
    table?: string;
    column?: string;
  };
  // Even older flat shape fallback
  fromTable?: string;
  fromColumn?: string;
  toTable?: string;
  toColumn?: string;
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
  const [searchQuery, setSearchQuery] = useState("");

  function toggleTable(tableName: string) {
    setExpandedTables((current) =>
      current.includes(tableName)
        ? current.filter((name) => name !== tableName)
        : [...current, tableName]
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const filteredTables = tables.filter((table, index) => {
    if (!query) return true;
    const name = (table.name ?? table.tableName ?? `Table ${index + 1}`).toLowerCase();
    if (name.includes(query)) return true;
    const matchCol = (table.columns ?? []).some((col) => {
      const colName = (col.name ?? col.columnName ?? "").toLowerCase();
      const colType = (col.type ?? col.dataType ?? "").toLowerCase();
      return colName.includes(query) || colType.includes(query);
    });
    return matchCol;
  });

  function expandAll() {
    setExpandedTables(
      filteredTables.map(
        (t, idx) => t.name ?? t.tableName ?? `Table ${idx + 1}`
      )
    );
  }

  function collapseAll() {
    setExpandedTables([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-300">
            {tables.length} {tables.length === 1 ? "table" : "tables"} detected
          </p>
          {query && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-400">
              {filteredTables.length} match{filteredTables.length === 1 ? "" : "es"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {tables.length > 0 && (
            <>
              <button
                type="button"
                onClick={expandAll}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
              >
                Collapse all
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onInspect}
            disabled={!isConnected || isInspecting}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInspecting ? "Loading Schema..." : "Inspect Schema"}
          </button>
        </div>
      </div>

      {tables.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tables or columns..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      )}

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

      {tables.length > 0 && filteredTables.length === 0 && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center text-sm text-slate-400">
          No tables or columns match &ldquo;{searchQuery}&rdquo;.
        </p>
      )}

      {filteredTables.map((table, index) => {
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
                              ? "PK"
                              : null,
                            column.foreignKey || column.isForeignKey
                              ? "FK"
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
                      {table.relationships.map((rel, relIdx) => {
                        // Resolve from all possible backend shapes
                        const fromCol =
                          rel.column ??
                          rel.fromColumn ??
                          "?";
                        const toTable =
                          rel.referencedTable ??
                          rel.references?.table ??
                          rel.toTable ??
                          "?";
                        const toCol =
                          rel.referencedColumn ??
                          rel.references?.column ??
                          rel.toColumn ??
                          "?";

                        return (
                          <p
                            key={relIdx}
                            className="break-words rounded-lg bg-slate-900 p-3 text-sm text-slate-400"
                          >
                            <span className="text-slate-300">{fromCol}</span>
                            {" → "}
                            <span className="text-blue-300">{toTable}.{toCol}</span>
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
