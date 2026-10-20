const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateSelectQuery,
} = require("../src/services/sql-validation.service");
const {
  analyzeProjectFiles,
} = require("../src/services/codebase.service");
const {
  normalizeSchemaSnapshot,
  compareSchemas,
  analyzeMigrationSql,
} = require("../src/services/drift.service");

// Realistic schema consistent with database/seed.sql
const demoSchema = {
  database: "ordermng",
  engine: "mysql",
  tables: [
    {
      name: "departments",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "name", type: "varchar", primaryKey: false, nullable: false },
      ],
      relationships: [],
    },
    {
      name: "students",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "name", type: "varchar", primaryKey: false, nullable: false },
        { name: "email", type: "varchar", primaryKey: false, nullable: false },
        { name: "legacy_phone", type: "varchar", primaryKey: false, nullable: true },
        { name: "department_id", type: "int", primaryKey: false, nullable: true },
      ],
      relationships: [
        {
          column: "department_id",
          referencedTable: "departments",
          referencedColumn: "id",
        },
      ],
    },
    {
      name: "courses",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "course_name", type: "varchar", primaryKey: false, nullable: false },
        { name: "department_id", type: "int", primaryKey: false, nullable: true },
      ],
      relationships: [],
    },
    {
      name: "orders",
      columns: [
        { name: "id", type: "int", primaryKey: true, nullable: false },
        { name: "user_id", type: "int", primaryKey: false, nullable: false },
        { name: "total", type: "decimal", primaryKey: false, nullable: false },
        { name: "status", type: "varchar", primaryKey: false, nullable: false },
      ],
      relationships: [],
    },
  ],
};

// Scenario A: Valid SQL Query Verification
test("Scenario A: Valid SQL queries pass validation", () => {
  const query = "SELECT id, name, email FROM students WHERE department_id = 1;";
  const res = validateSelectQuery(query, demoSchema);

  assert.equal(res.status, "valid");
  assert.equal(res.supported, true);
  assert.equal(res.findings.length, 0);
});

// Scenario B: Missing Table or Column Detection
test("Scenario B1: Nonexistent table is detected with precise error finding", () => {
  const query = "SELECT id, title FROM teachers WHERE active = 1;";
  const res = validateSelectQuery(query, demoSchema);

  assert.equal(res.status, "invalid");
  const tableFinding = res.findings.find((f) => f.code === "TABLE_NOT_FOUND");
  assert.ok(tableFinding, "Should detect TABLE_NOT_FOUND");
  assert.equal(tableFinding.table, "teachers");
});

test("Scenario B2: Nonexistent column is detected with precise table context", () => {
  const query = "SELECT id, name, students.gpa FROM students WHERE id = 1;";
  const res = validateSelectQuery(query, demoSchema);

  assert.equal(res.status, "invalid");
  const colFinding = res.findings.find((f) => f.code === "COLUMN_NOT_FOUND");
  assert.ok(colFinding, "Should detect COLUMN_NOT_FOUND");
  assert.equal(colFinding.column, "gpa");
  assert.equal(colFinding.table, "students");
});

// Scenario C: Unsupported Query Handling
test("Scenario C: Unsupported queries (UNION) are reported as unsupported without false valid/invalid", () => {
  const query = "SELECT id FROM students UNION SELECT id FROM courses;";
  const res = validateSelectQuery(query, demoSchema);

  assert.equal(res.status, "unsupported");
  assert.equal(res.supported, false);
});

// Scenario E: Schema Drift & Migration Impact
test("Scenario E: Dropping a column in a migration is detected and flags affected queries", () => {
  const migrationSql = "ALTER TABLE students DROP COLUMN legacy_phone; DROP TABLE old_audit_logs;";
  const migrationOps = analyzeMigrationSql(migrationSql);

  assert.equal(migrationOps.length, 2);
  const dropCol = migrationOps.find((op) => op.action === "DROP_COLUMN");
  const dropTbl = migrationOps.find((op) => op.action === "DROP_TABLE");
  assert.ok(dropCol, "Should find DROP_COLUMN operation");
  assert.equal(dropCol.column, "legacy_phone");
  assert.ok(dropTbl, "Should find DROP_TABLE operation");
  assert.equal(dropTbl.table, "old_audit_logs");

  // Create drifted schema after migration
  const driftedSchema = JSON.parse(JSON.stringify(demoSchema));
  const studentTable = driftedSchema.tables.find((t) => t.name === "students");
  studentTable.columns = studentTable.columns.filter((c) => c.name !== "legacy_phone");

  const snapBase = normalizeSchemaSnapshot(demoSchema);
  const snapDrifted = normalizeSchemaSnapshot(driftedSchema);

  const appAnalysis = {
    files: [
      {
        path: "src/student-card.js",
        sqlCandidates: [
          {
            line: 18,
            sql: "SELECT id, name, legacy_phone FROM students WHERE id = 1;",
          },
        ],
      },
    ],
  };

  const driftReport = compareSchemas(snapBase, snapDrifted, appAnalysis);

  assert.equal(driftReport.hasDrift, true);
  assert.equal(driftReport.summary.breakingChangesCount, 1);
  assert.equal(driftReport.affectedQueries.length, 1);
  assert.equal(driftReport.affectedQueries[0].file, "src/student-card.js");
  assert.match(driftReport.affectedQueries[0].issue, /legacy_phone/);
});

// Scenario F: Security Safeguards
test("Scenario F1: Malicious directory traversal paths are rejected", () => {
  const files = [
    { path: "../../etc/passwd", content: "root:x:0:0::/root:/bin/bash" },
    { path: "/absolute/path/file.js", content: "SELECT * FROM secret;" },
    { path: "src/safe.js", content: "SELECT id FROM students;" },
  ];

  const analysis = analyzeProjectFiles(files);

  assert.equal(analysis.files.length, 1);
  assert.equal(analysis.files[0].path, "src/safe.js");
});

test("Scenario F2: Binary files and size bomb files are guarded", () => {
  const files = [
    { path: "src/binary.js", content: "SELECT\0evil" },
  ];

  const analysis = analyzeProjectFiles(files);
  assert.equal(analysis.files.length, 0);
});
