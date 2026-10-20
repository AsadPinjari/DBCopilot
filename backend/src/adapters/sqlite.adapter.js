const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const BaseDatabaseAdapter = require("./base.adapter");
const { validateSelectQuery } = require("../services/sql-validation.service");

class SQLiteAdapter extends BaseDatabaseAdapter {
  constructor() {
    super("sqlite", "SQLite", "relational");
  }

  getCapabilities() {
    return {
      engine: this.engine,
      displayName: this.displayName,
      category: "relational",
      status: "Implemented and tested",
      features: {
        connection: "Implemented and tested",
        schemaInspection: "Implemented and tested",
        queryValidation: "Implemented and tested",
        codebaseDetection: "Implemented and tested",
        aiAssistance: "Implemented and tested",
        diagnostics: "Implemented and tested",
      },
      notes: "Native SQLite support using node:sqlite. Supports local database file inspection, PRAGMA metadata, and SQL validation.",
    };
  }

  resolveDatabasePath(config) {
    const rawPath = config.database || config.filePath || config.filename;
    if (!rawPath) {
      throw new Error("SQLite requires a database file path (e.g. ./app.db or :memory:).");
    }

    if (rawPath === ":memory:") {
      return ":memory:";
    }

    // Resolve relative path to workspace or absolute path
    const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    return resolved;
  }

  async testConnection(config) {
    const dbPath = this.resolveDatabasePath(config);

    if (dbPath !== ":memory:" && !fs.existsSync(dbPath)) {
      throw new Error(`SQLite database file does not exist at "${dbPath}".`);
    }

    let db;
    try {
      db = new DatabaseSync(dbPath, { readOnly: dbPath !== ":memory:" });
      db.exec("SELECT 1;");
      return true;
    } finally {
      if (db) db.close();
    }
  }

  async inspectSchema(config) {
    const dbPath = this.resolveDatabasePath(config);
    let db;

    try {
      db = new DatabaseSync(dbPath, { readOnly: dbPath !== ":memory:" });

      // Fetch user tables (excluding sqlite_ internal tables)
      const tablesStmt = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
      `);
      const tableRows = tablesStmt.all();

      const schema = {
        database: path.basename(dbPath),
        engine: this.engine,
        tables: [],
      };

      for (const tRow of tableRows) {
        const tableName = tRow.name;

        // Fetch columns via PRAGMA table_info
        const colStmt = db.prepare(`PRAGMA table_info('${tableName}');`);
        const colRows = colStmt.all();

        // Fetch foreign keys via PRAGMA foreign_key_list
        const fkStmt = db.prepare(`PRAGMA foreign_key_list('${tableName}');`);
        const fkRows = fkStmt.all();

        const tableObject = {
          name: tableName,
          columns: colRows.map((col) => ({
            name: col.name,
            type: (col.type || "text").toLowerCase(),
            fullType: col.type || "text",
            nullable: col.notnull === 0,
            primaryKey: col.pk === 1,
            unique: false,
            foreignKey: fkRows.some((fk) => fk.from === col.name),
            default: col.dflt_value,
          })),
          relationships: fkRows.map((fk) => ({
            column: fk.from,
            referencedTable: fk.table,
            referencedColumn: fk.to,
            references: {
              table: fk.table,
              column: fk.to,
            },
          })),
        };

        schema.tables.push(tableObject);
      }

      return schema;
    } finally {
      if (db) db.close();
    }
  }

  validateQuery(query, schema) {
    return validateSelectQuery(query, schema);
  }
}

module.exports = SQLiteAdapter;
