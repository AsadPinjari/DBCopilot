const test = require("node:test");
const assert = require("node:assert/strict");

// We test the formatting logic directly
function formatFindingMessage(finding) {
  if (typeof finding === "string") {
    return {
      message: finding,
      code: "SQL_VALIDATION",
      severity: "Warning",
    };
  }

  if (!finding || typeof finding !== "object") {
    return {
      message: String(finding),
      code: "UNKNOWN",
      severity: "Information",
    };
  }

  const f = finding;

  if (f.code === "TABLE_NOT_FOUND" && f.table) {
    return {
      message: `Table "${f.table}" does not exist in the connected database schema.`,
      code: "TABLE_NOT_FOUND",
      severity: "Error",
    };
  }

  if (f.code === "COLUMN_NOT_FOUND" && f.column) {
    const tblInfo = f.table ? ` in table "${f.table}"` : "";
    return {
      message: `Column "${f.column}" does not exist${tblInfo}.`,
      code: "COLUMN_NOT_FOUND",
      severity: "Error",
    };
  }

  if (f.code === "UNKNOWN_TABLE_ALIAS" && f.alias) {
    return {
      message: `Unknown table alias "${f.alias}".`,
      code: "UNKNOWN_TABLE_ALIAS",
      severity: "Error",
    };
  }

  if (f.code === "AMBIGUOUS_COLUMN" && f.column) {
    const tbls = (f.tables || []).join(", ");
    return {
      message: `Ambiguous column "${f.column}" — present in multiple tables: ${tbls}.`,
      code: "AMBIGUOUS_COLUMN",
      severity: "Warning",
    };
  }

  return {
    message: f.message || JSON.stringify(finding),
    code: f.code || "SCHEMA_VALIDATION",
    severity: "Warning",
  };
}

test("formatFindingMessage formats TABLE_NOT_FOUND as Error", () => {
  const result = formatFindingMessage({
    code: "TABLE_NOT_FOUND",
    table: "teachers",
  });
  assert.equal(result.severity, "Error");
  assert.match(result.message, /Table "teachers" does not exist/);
});

test("formatFindingMessage formats COLUMN_NOT_FOUND as Error", () => {
  const result = formatFindingMessage({
    code: "COLUMN_NOT_FOUND",
    table: "students",
    column: "gpa",
  });
  assert.equal(result.severity, "Error");
  assert.match(result.message, /Column "gpa" does not exist in table "students"/);
});

test("formatFindingMessage formats AMBIGUOUS_COLUMN as Warning", () => {
  const result = formatFindingMessage({
    code: "AMBIGUOUS_COLUMN",
    column: "name",
    tables: ["students", "departments"],
  });
  assert.equal(result.severity, "Warning");
  assert.match(result.message, /Ambiguous column "name"/);
});
