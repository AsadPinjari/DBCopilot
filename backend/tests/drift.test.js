const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeSchemaSnapshot,
  compareSchemas,
  analyzeMigrationSql,
} = require("../src/services/drift.service");

const mockSchemaV1 = {
  database: "shop_db",
  engine: "mysql",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "email", type: "varchar", nullable: false },
        { name: "legacy_phone", type: "varchar", nullable: true },
      ],
      relationships: [],
    },
    {
      name: "orders",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "user_id", type: "int", nullable: false },
        { name: "total", type: "decimal", nullable: false },
      ],
      relationships: [
        {
          column: "user_id",
          referencedTable: "users",
          referencedColumn: "id",
        },
      ],
    },
  ],
};

const mockSchemaV2 = {
  database: "shop_db",
  engine: "mysql",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "email", type: "varchar", nullable: false },
        { name: "new_status", type: "varchar", nullable: false }, // added
        // legacy_phone was removed
      ],
      relationships: [],
    },
    // orders was removed
    {
      name: "invoices", // added
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "amount", type: "decimal", nullable: false },
      ],
      relationships: [],
    },
  ],
};

test("normalizeSchemaSnapshot standardizes table and column format", () => {
  const snapshot = normalizeSchemaSnapshot(mockSchemaV1);
  assert.equal(snapshot.version, "1.0");
  assert.equal(snapshot.database, "shop_db");
  assert.equal(snapshot.tableCount, 2);
  assert.ok(snapshot.tables.users);
  assert.ok(snapshot.tables.users.columns.id);
  assert.equal(snapshot.tables.users.columns.id.primaryKey, true);
});

test("compareSchemas detects added, removed, and modified tables", () => {
  const snap1 = normalizeSchemaSnapshot(mockSchemaV1);
  const snap2 = normalizeSchemaSnapshot(mockSchemaV2);

  const diff = compareSchemas(snap1, snap2);

  assert.equal(diff.hasDrift, true);
  // invoices added
  assert.equal(diff.addedTables.length, 1);
  assert.equal(diff.addedTables[0].table, "invoices");

  // orders removed
  assert.equal(diff.removedTables.length, 1);
  assert.equal(diff.removedTables[0].table, "orders");

  // users modified (new_status added, legacy_phone removed)
  assert.equal(diff.modifiedTables.length, 1);
  const userMod = diff.modifiedTables[0];
  assert.equal(userMod.table, "users");
  assert.equal(userMod.addedColumns.length, 1);
  assert.equal(userMod.addedColumns[0].name, "new_status");
  assert.equal(userMod.removedColumns.length, 1);
  assert.equal(userMod.removedColumns[0].name, "legacy_phone");

  // breaking changes flagged
  assert.ok(
    diff.breakingChanges.some(
      (b) => b.type === "TABLE_REMOVED" && b.table === "orders"
    )
  );
  assert.ok(
    diff.breakingChanges.some(
      (b) => b.type === "COLUMN_REMOVED" && b.column === "legacy_phone"
    )
  );
});

test("compareSchemas cross-references affected application queries", () => {
  const snap1 = normalizeSchemaSnapshot(mockSchemaV1);
  const snap2 = normalizeSchemaSnapshot(mockSchemaV2);

  const appAnalysis = {
    files: [
      {
        path: "src/user-service.js",
        sqlCandidates: [
          {
            line: 42,
            sql: "SELECT id, email, legacy_phone FROM users WHERE id = 1;",
          },
          {
            line: 55,
            sql: "SELECT id FROM orders WHERE user_id = 1;",
          },
        ],
      },
    ],
  };

  const diff = compareSchemas(snap1, snap2, appAnalysis);

  assert.equal(diff.affectedQueries.length, 2);
  assert.ok(
    diff.affectedQueries.some(
      (q) => q.line === 42 && q.issue.includes("legacy_phone")
    )
  );
  assert.ok(
    diff.affectedQueries.some(
      (q) => q.line === 55 && q.issue.includes("orders")
    )
  );
});

test("analyzeMigrationSql detects DROP TABLE and DROP COLUMN operations", () => {
  const migrationSql = `
    -- Migration 002: Drop deprecated table and column
    DROP TABLE old_audit_logs;
    ALTER TABLE users DROP COLUMN legacy_phone;
    ALTER TABLE products RENAME COLUMN old_sku TO new_sku;
  `;

  const operations = analyzeMigrationSql(migrationSql);

  assert.equal(operations.length, 3);
  assert.equal(operations[0].action, "DROP_TABLE");
  assert.equal(operations[0].table, "old_audit_logs");
  assert.equal(operations[1].action, "DROP_COLUMN");
  assert.equal(operations[1].column, "legacy_phone");
  assert.equal(operations[2].action, "RENAME_COLUMN");
  assert.equal(operations[2].oldColumn, "old_sku");
});
