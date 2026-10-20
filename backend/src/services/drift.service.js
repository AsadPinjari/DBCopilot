/**
 * Schema Drift and Migration Impact Analysis Service
 */

/**
 * Normalize raw schema into a canonical snapshot format for deterministic comparisons.
 */
function normalizeSchemaSnapshot(rawSchema) {
  if (!rawSchema) {
    throw new Error("Schema object is required to generate snapshot.");
  }

  const database = rawSchema.database || "unknown";
  const tables = {};

  const tableList = Array.isArray(rawSchema.tables)
    ? rawSchema.tables
    : Array.isArray(rawSchema)
      ? rawSchema
      : [];

  for (const table of tableList) {
    const tableName = (table.name || table.tableName || "").toLowerCase();
    if (!tableName) continue;

    const columns = {};
    for (const col of table.columns || []) {
      const colName = (col.name || col.columnName || "").toLowerCase();
      if (!colName) continue;

      columns[colName] = {
        name: col.name || col.columnName,
        type: (col.type || col.dataType || "").toLowerCase(),
        fullType: (col.fullType || col.type || "").toLowerCase(),
        nullable: Boolean(col.nullable ?? col.isNullable ?? true),
        primaryKey: Boolean(col.primaryKey ?? col.isPrimaryKey ?? false),
        unique: Boolean(col.unique ?? false),
        foreignKey: Boolean(col.foreignKey ?? col.isForeignKey ?? false),
        default: col.default ?? null,
      };
    }

    const foreignKeys = (table.relationships || []).map((rel) => ({
      column: (rel.column || rel.fromColumn || "").toLowerCase(),
      referencedTable: (
        rel.referencedTable ||
        rel.references?.table ||
        rel.toTable ||
        ""
      ).toLowerCase(),
      referencedColumn: (
        rel.referencedColumn ||
        rel.references?.column ||
        rel.toColumn ||
        ""
      ).toLowerCase(),
      constraintName: rel.constraintName || undefined,
    }));

    tables[tableName] = {
      name: table.name || table.tableName,
      columns,
      foreignKeys,
    };
  }

  return {
    version: "1.0",
    engine: rawSchema.engine || "mysql",
    database,
    createdAt: new Date().toISOString(),
    tableCount: Object.keys(tables).length,
    tables,
  };
}

/**
 * Compare two normalized schema snapshots to detect drift and compatibility risks.
 */
function compareSchemas(baseSnapshot, currentSnapshot, applicationAnalysis = null) {
  const baseTables = baseSnapshot?.tables || {};
  const currentTables = currentSnapshot?.tables || {};

  const addedTables = [];
  const removedTables = [];
  const modifiedTables = [];
  const breakingChanges = [];

  const baseKeys = new Set(Object.keys(baseTables));
  const currentKeys = new Set(Object.keys(currentTables));

  // 1. Detect added tables
  for (const key of currentKeys) {
    if (!baseKeys.has(key)) {
      addedTables.push({
        table: currentTables[key].name || key,
        columnCount: Object.keys(currentTables[key].columns || {}).length,
      });
    }
  }

  // 2. Detect removed tables
  for (const key of baseKeys) {
    if (!currentKeys.has(key)) {
      const tableName = baseTables[key].name || key;
      removedTables.push({
        table: tableName,
      });
      breakingChanges.push({
        type: "TABLE_REMOVED",
        severity: "CRITICAL",
        table: tableName,
        message: `Table "${tableName}" was dropped or removed in the current schema.`,
      });
    }
  }

  // 3. Detect modified tables
  for (const key of baseKeys) {
    if (!currentKeys.has(key)) continue;

    const baseTable = baseTables[key];
    const currentTable = currentTables[key];

    const baseCols = baseTable.columns || {};
    const currentColCols = currentTable.columns || {};

    const baseColKeys = new Set(Object.keys(baseCols));
    const currentColKeys = new Set(Object.keys(currentColCols));

    const addedColumns = [];
    const removedColumns = [];
    const changedColumns = [];

    for (const cKey of currentColKeys) {
      if (!baseColKeys.has(cKey)) {
        addedColumns.push(currentColCols[cKey]);
      }
    }

    for (const cKey of baseColKeys) {
      if (!currentColKeys.has(cKey)) {
        const col = baseCols[cKey];
        removedColumns.push(col);
        breakingChanges.push({
          type: "COLUMN_REMOVED",
          severity: "HIGH",
          table: baseTable.name || key,
          column: col.name || cKey,
          message: `Column "${col.name || cKey}" in table "${baseTable.name || key}" was removed.`,
        });
      }
    }

    // Check for changed column definitions
    for (const cKey of baseColKeys) {
      if (!currentColKeys.has(cKey)) continue;

      const baseCol = baseCols[cKey];
      const curCol = currentColCols[cKey];

      const diffs = [];
      if (baseCol.type !== curCol.type) {
        diffs.push(`Type changed from ${baseCol.type} to ${curCol.type}`);
      }
      if (baseCol.nullable !== curCol.nullable) {
        diffs.push(
          curCol.nullable
            ? "Nullability changed to NULL"
            : "Nullability changed to NOT NULL"
        );
        if (!curCol.nullable && curCol.default === null) {
          breakingChanges.push({
            type: "COLUMN_RESTRICTION",
            severity: "MEDIUM",
            table: baseTable.name || key,
            column: curCol.name || cKey,
            message: `Column "${curCol.name}" in table "${baseTable.name}" changed to NOT NULL without default value. Existing INSERT statements may fail.`,
          });
        }
      }

      if (diffs.length > 0) {
        changedColumns.push({
          column: curCol.name || cKey,
          changes: diffs,
          oldDefinition: baseCol,
          newDefinition: curCol,
        });
      }
    }

    if (
      addedColumns.length > 0 ||
      removedColumns.length > 0 ||
      changedColumns.length > 0
    ) {
      modifiedTables.push({
        table: currentTable.name || key,
        addedColumns,
        removedColumns,
        changedColumns,
      });
    }
  }

  // 4. Cross-reference with application queries if provided
  const affectedQueries = [];
  if (applicationAnalysis && Array.isArray(applicationAnalysis.files)) {
    for (const file of applicationAnalysis.files) {
      for (const candidate of file.sqlCandidates || []) {
        const sql = candidate.sql || "";

        for (const breaking of breakingChanges) {
          const tablePattern = new RegExp(`\\b${breaking.table}\\b`, "i");
          if (tablePattern.test(sql)) {
            if (breaking.column) {
              const colPattern = new RegExp(`\\b${breaking.column}\\b`, "i");
              if (colPattern.test(sql)) {
                affectedQueries.push({
                  file: file.path,
                  line: candidate.line,
                  sql: sql.slice(0, 100),
                  issue: `References removed column "${breaking.table}.${breaking.column}"`,
                  severity: breaking.severity,
                });
              }
            } else {
              affectedQueries.push({
                file: file.path,
                line: candidate.line,
                sql: sql.slice(0, 100),
                issue: `References removed table "${breaking.table}"`,
                severity: breaking.severity,
              });
            }
          }
        }
      }
    }
  }

  const hasDrift =
    addedTables.length > 0 ||
    removedTables.length > 0 ||
    modifiedTables.length > 0;

  return {
    hasDrift,
    summary: {
      addedTablesCount: addedTables.length,
      removedTablesCount: removedTables.length,
      modifiedTablesCount: modifiedTables.length,
      breakingChangesCount: breakingChanges.length,
      affectedQueriesCount: affectedQueries.length,
    },
    addedTables,
    removedTables,
    modifiedTables,
    breakingChanges,
    affectedQueries,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Detect dangerous migration patterns from SQL statements.
 */
function analyzeMigrationSql(sqlText) {
  const operations = [];

  // Drop table
  const dropTableMatches = sqlText.matchAll(
    /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"']?)([a-zA-Z0-9_]+)\1/gi
  );
  for (const match of dropTableMatches) {
    operations.push({
      action: "DROP_TABLE",
      table: match[2],
      severity: "CRITICAL",
      description: `Drops table "${match[2]}"`,
    });
  }

  // Drop column
  const dropColMatches = sqlText.matchAll(
    /\bALTER\s+TABLE\s+([`"']?)([a-zA-Z0-9_]+)\1[\s\S]*?\bDROP\s+(?:COLUMN\s+)?([`"']?)([a-zA-Z0-9_]+)\3/gi
  );
  for (const match of dropColMatches) {
    operations.push({
      action: "DROP_COLUMN",
      table: match[2],
      column: match[4],
      severity: "HIGH",
      description: `Drops column "${match[4]}" from table "${match[2]}"`,
    });
  }

  // Rename column
  const renameColMatches = sqlText.matchAll(
    /\bALTER\s+TABLE\s+([`"']?)([a-zA-Z0-9_]+)\1[\s\S]*?\bRENAME\s+COLUMN\s+([`"']?)([a-zA-Z0-9_]+)\3\s+TO\s+([`"']?)([a-zA-Z0-9_]+)\5/gi
  );
  for (const match of renameColMatches) {
    operations.push({
      action: "RENAME_COLUMN",
      table: match[2],
      oldColumn: match[4],
      newColumn: match[6],
      severity: "HIGH",
      description: `Renames column "${match[4]}" to "${match[6]}" in table "${match[2]}"`,
    });
  }

  return operations;
}

module.exports = {
  normalizeSchemaSnapshot,
  compareSchemas,
  analyzeMigrationSql,
};
