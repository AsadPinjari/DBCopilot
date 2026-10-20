const BaseDatabaseAdapter = require("./base.adapter");

class UnsupportedStubAdapter extends BaseDatabaseAdapter {
  constructor(engine, displayName, category, status, notes) {
    super(engine, displayName, category);
    this.status = status;
    this.notes = notes;
  }

  getCapabilities() {
    return {
      engine: this.engine,
      displayName: this.displayName,
      category: this.category,
      status: this.status,
      features: {
        connection: this.status === "Partially supported" ? "Partially supported" : "Not implemented",
        schemaInspection: "Not implemented",
        queryValidation: "Not implemented",
        codebaseDetection: "Partially supported",
        aiAssistance: "Implemented and tested",
        diagnostics: "Partially supported",
      },
      notes: this.notes,
    };
  }

  async testConnection() {
    throw new Error(
      `Direct connection to ${this.displayName} is not yet implemented in this release. ${this.notes}`
    );
  }

  async inspectSchema() {
    throw new Error(
      `Schema introspection for ${this.displayName} is not yet implemented. ${this.notes}`
    );
  }

  validateQuery(query) {
    return {
      status: "unsupported",
      supported: false,
      findings: [
        {
          code: "DIALECT_NOT_IMPLEMENTED",
          message: `Query validation for ${this.displayName} dialect is not yet fully implemented. Manual review recommended.`,
        },
      ],
    };
  }
}

function createStubs() {
  return [
    new UnsupportedStubAdapter(
      "sqlserver",
      "Microsoft SQL Server",
      "relational",
      "Partially supported",
      "T-SQL parsing and connection driver planned. AI assistance available."
    ),
    new UnsupportedStubAdapter(
      "oracle",
      "Oracle Database",
      "relational",
      "Partially supported",
      "PL/SQL dialect parser and Oracle OCI client planned. AI assistance available."
    ),
    new UnsupportedStubAdapter(
      "cassandra",
      "Apache Cassandra",
      "non-relational",
      "Partially supported",
      "CQL keyspace parser planned. AI assistance available."
    ),
    new UnsupportedStubAdapter(
      "neo4j",
      "Neo4j",
      "non-relational",
      "Partially supported",
      "Cypher graph pattern analyzer planned. AI assistance available."
    ),
    new UnsupportedStubAdapter(
      "snowflake",
      "Snowflake",
      "warehouse",
      "Partially supported",
      "Cloud data warehouse adapter planned. AI assistance available."
    ),
    new UnsupportedStubAdapter(
      "redshift",
      "Amazon Redshift",
      "warehouse",
      "Partially supported",
      "PostgreSQL-compatible warehouse dialect partially supported via Postgres driver."
    ),
    new UnsupportedStubAdapter(
      "bigquery",
      "Google BigQuery",
      "warehouse",
      "Partially supported",
      "Google Cloud BigQuery client planned. AI assistance available."
    ),
  ];
}

module.exports = {
  UnsupportedStubAdapter,
  createStubs,
};
