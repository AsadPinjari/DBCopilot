
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateSelectQuery,
} = require("../src/services/sql-validation.service");

// Keep this schema consistent with your demo MySQL database.
const schema = {
  database: "dbcopilot_demo",
  tables: [
    {
      name: "departments",
      columns: [
        { name: "id" },
        { name: "name" },
      ],
    },
    {
      name: "students",
      columns: [
        { name: "id" },
        { name: "name" },
        { name: "email" },
        { name: "department_id" },
      ],
    },
    {
      name: "courses",
      columns: [
        { name: "id" },
        { name: "course_name" },
        { name: "department_id" },
      ],
    },
  ],
};

test("accepts a valid SELECT query", () => {
  const result = validateSelectQuery(
    "SELECT id, course_name FROM courses WHERE department_id = 1;",
    schema
  );

  assert.equal(result.status, "valid");
});

test("detects a nonexistent column", () => {
  const result = validateSelectQuery(
    "SELECT missing_id FROM departments;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "COLUMN_NOT_FOUND" &&
        finding.column === "missing_id"
    )
  );
});

test("detects a nonexistent table", () => {
  const result = validateSelectQuery(
    "SELECT id FROM teachers;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "TABLE_NOT_FOUND"
    )
  );
});

test("detects an undefined table alias", () => {
  const result = validateSelectQuery(
    "SELECT x.name FROM students s;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "UNKNOWN_TABLE_ALIAS"
    )
  );
});

test("detects an ambiguous unqualified column", () => {
  const result = validateSelectQuery(
    "SELECT name FROM students s JOIN departments d ON s.department_id = d.id;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "AMBIGUOUS_COLUMN"
    )
  );
});

test("accepts a valid JOIN", () => {
  const result = validateSelectQuery(
    "SELECT s.name, d.name FROM students s JOIN departments d ON s.department_id = d.id;",
    schema
  );

  assert.equal(result.status, "valid");
});

test("detects a missing column in a JOIN condition", () => {
  const result = validateSelectQuery(
    "SELECT s.name FROM students s JOIN departments d ON s.department_id = d.missing_id;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "COLUMN_NOT_FOUND" &&
        finding.column === "missing_id"
    )
  );
});


test("accepts a valid COUNT aggregate query", () => {
  const result = validateSelectQuery(
    "SELECT COUNT(*) FROM students;",
    schema
  );

  assert.equal(result.status, "valid");
});

test("accepts a valid ORDER BY query", () => {
  const result = validateSelectQuery(
    "SELECT id, name FROM students ORDER BY name;",
    schema
  );

  assert.equal(result.status, "valid");
});

test("detects a missing column in WHERE", () => {
  const result = validateSelectQuery(
    "SELECT id FROM students WHERE missing_id = 1;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "COLUMN_NOT_FOUND" &&
        finding.column === "missing_id"
    )
  );
});

test("detects a missing column in GROUP BY", () => {
  const result = validateSelectQuery(
    "SELECT department_id, COUNT(*) FROM students GROUP BY missing_id;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "COLUMN_NOT_FOUND" &&
        finding.column === "missing_id"
    )
  );
});

test("does not mark unsupported SQL as valid", () => {
  const result = validateSelectQuery(
    "SELECT id FROM students UNION SELECT id FROM courses;",
    schema
  );

  assert.equal(result.status, "unsupported");
});


test("detects an undefined alias used with wildcard", () => {
  const result = validateSelectQuery(
    "SELECT x.* FROM students s;",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) => finding.code === "UNKNOWN_TABLE_ALIAS"
    )
  );
});

test("accepts a valid subquery with isolated scope without false ambiguous column errors", () => {
  const result = validateSelectQuery(
    "SELECT id, name FROM students WHERE department_id IN (SELECT id FROM departments);",
    schema
  );

  assert.equal(result.status, "valid");
  assert.equal(result.findings.length, 0);
});

test("detects a nonexistent table in a subquery", () => {
  const result = validateSelectQuery(
    "SELECT id, name FROM students WHERE department_id IN (SELECT id FROM nonexistent_departments);",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "TABLE_NOT_FOUND" &&
        finding.table === "nonexistent_departments"
    )
  );
});

test("detects a nonexistent column in a subquery", () => {
  const result = validateSelectQuery(
    "SELECT id, name FROM students WHERE department_id IN (SELECT nonexistent_col FROM departments);",
    schema
  );

  assert.equal(result.status, "invalid");
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "COLUMN_NOT_FOUND" &&
        finding.column === "nonexistent_col"
    )
  );
});

test("accepts a correlated subquery referencing parent table aliases", () => {
  const result = validateSelectQuery(
    "SELECT s.id, s.name FROM students s WHERE department_id IN (SELECT d.id FROM departments d WHERE d.name = s.name);",
    schema
  );

  assert.equal(result.status, "valid");
  assert.equal(result.findings.length, 0);
});

