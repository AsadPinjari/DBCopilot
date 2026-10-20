const { Client } = require("pg");
const BaseDatabaseAdapter = require("./base.adapter");
const { validateSelectQuery } = require("../services/sql-validation.service");

const CONNECTION_TIMEOUT_MS = 10000;

class PostgreSQLAdapter extends BaseDatabaseAdapter {
  constructor() {
    super("postgres", "PostgreSQL", "relational");
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
      notes: "Full support for PostgreSQL schemas, public tables, constraints, foreign keys, and $1 parameter normalization.",
    };
  }

  buildConfig(config) {
    const pgConfig = {
      host: config.host || "localhost",
      port: Number(config.port) || 5432,
      user: config.username,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    };

    if (config.ssl) {
      pgConfig.ssl = typeof config.ssl === "object" ? config.ssl : { rejectUnauthorized: false };
    }

    return pgConfig;
  }

  async testConnection(config) {
    const client = new Client(this.buildConfig(config));
    try {
      await client.connect();
      await client.query("SELECT 1;");
      return true;
    } finally {
      await client.end().catch(() => {});
    }
  }

  async inspectSchema(config) {
    const client = new Client(this.buildConfig(config));

    try {
      await client.connect();

      // Fetch base tables in public schema
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      // Fetch columns and data types
      const columnsResult = await client.query(`
        SELECT
          c.table_name,
          c.column_name,
          c.data_type,
          c.udt_name,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position;
      `);

      // Fetch foreign keys
      const fkResult = await client.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.ordinal_position;
      `);

      const schema = {
        database: config.database,
        engine: this.engine,
        tables: [],
      };

      const foreignKeys = fkResult.rows;
      const fkColumnSet = new Set(
        foreignKeys.map((fk) => `${fk.table_name}.${fk.column_name}`)
      );

      for (const tRow of tablesResult.rows) {
        const tableName = tRow.table_name;
        const tableColumns = columnsResult.rows.filter(
          (col) => col.table_name === tableName
        );

        const tableObject = {
          name: tableName,
          columns: [],
          relationships: [],
        };

        for (const col of tableColumns) {
          const hasForeignKey = fkColumnSet.has(`${tableName}.${col.column_name}`);

          tableObject.columns.push({
            name: col.column_name,
            type: col.data_type,
            fullType: col.udt_name || col.data_type,
            nullable: col.is_nullable === "YES",
            primaryKey: col.is_primary_key,
            unique: false,
            foreignKey: hasForeignKey,
            default: col.column_default,
          });
        }

        tableObject.relationships = foreignKeys
          .filter((fk) => fk.table_name === tableName)
          .map((fk) => ({
            column: fk.column_name,
            referencedTable: fk.foreign_table_name,
            referencedColumn: fk.foreign_column_name,
            constraintName: fk.constraint_name,
            references: {
              table: fk.foreign_table_name,
              column: fk.foreign_column_name,
            },
          }));

        schema.tables.push(tableObject);
      }

      return schema;
    } finally {
      await client.end().catch(() => {});
    }
  }

  validateQuery(query, schema) {
    // Convert Postgres $1, $2, ... parameter markers to ? for parser compatibility
    const normalized = query.replace(/\$\d+/g, "?");
    return validateSelectQuery(normalized, schema);
  }
}

module.exports = PostgreSQLAdapter;
