const mysql = require("mysql2/promise");
const BaseDatabaseAdapter = require("./base.adapter");
const { validateSelectQuery } = require("../services/sql-validation.service");

const CONNECTION_TIMEOUT_MS = 10000;

class MySQLAdapter extends BaseDatabaseAdapter {
  constructor(engine = "mysql", displayName = "MySQL") {
    super(engine, displayName, "relational");
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
      notes: "Fully supported relational engine using mysql2 with connection timeouts and schema introspection.",
    };
  }

  buildConfig(config) {
    return {
      host: config.host || "localhost",
      port: Number(config.port) || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
      connectTimeout: CONNECTION_TIMEOUT_MS,
    };
  }

  async testConnection(config) {
    const connection = await mysql.createConnection(this.buildConfig(config));
    try {
      await connection.query("SELECT 1");
      return true;
    } finally {
      await connection.end();
    }
  }

  async inspectSchema(config) {
    const connection = await mysql.createConnection(this.buildConfig(config));

    try {
      const [tables] = await connection.query(
        `SELECT TABLE_NAME
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ?
         AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
        [config.database]
      );

      const [columns] = await connection.query(
        `SELECT
           TABLE_NAME,
           COLUMN_NAME,
           DATA_TYPE,
           COLUMN_TYPE,
           IS_NULLABLE,
           COLUMN_KEY,
           COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME, ORDINAL_POSITION`,
        [config.database]
      );

      const [foreignKeys] = await connection.query(
        `SELECT
           TABLE_NAME,
           COLUMN_NAME,
           REFERENCED_TABLE_NAME,
           REFERENCED_COLUMN_NAME,
           CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY TABLE_NAME, ORDINAL_POSITION`,
        [config.database]
      );

      const schema = {
        database: config.database,
        engine: this.engine,
        tables: [],
      };

      const fkColumnSet = new Set(
        foreignKeys.map((fk) => `${fk.TABLE_NAME}.${fk.COLUMN_NAME}`)
      );

      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        const tableColumns = columns.filter((col) => col.TABLE_NAME === tableName);

        const tableObject = {
          name: tableName,
          columns: [],
          relationships: [],
        };

        for (const column of tableColumns) {
          const hasForeignKey = fkColumnSet.has(
            `${tableName}.${column.COLUMN_NAME}`
          );

          tableObject.columns.push({
            name: column.COLUMN_NAME,
            type: column.DATA_TYPE,
            fullType: column.COLUMN_TYPE,
            nullable: column.IS_NULLABLE === "YES",
            primaryKey: column.COLUMN_KEY === "PRI",
            unique: column.COLUMN_KEY === "UNI",
            foreignKey: hasForeignKey,
            default: column.COLUMN_DEFAULT,
          });
        }

        tableObject.relationships = foreignKeys
          .filter((fk) => fk.TABLE_NAME === tableName)
          .map((fk) => ({
            column: fk.COLUMN_NAME,
            referencedTable: fk.REFERENCED_TABLE_NAME,
            referencedColumn: fk.REFERENCED_COLUMN_NAME,
            constraintName: fk.CONSTRAINT_NAME,
            references: {
              table: fk.REFERENCED_TABLE_NAME,
              column: fk.REFERENCED_COLUMN_NAME,
            },
          }));

        schema.tables.push(tableObject);
      }

      return schema;
    } finally {
      await connection.end();
    }
  }

  validateQuery(query, schema) {
    return validateSelectQuery(query, schema);
  }
}

module.exports = MySQLAdapter;
