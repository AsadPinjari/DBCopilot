
const { Parser } = require("node-sql-parser");

const parser = new Parser();

function normalizeName(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[`"']/g, "").trim().toLowerCase();
}

function getTable(schema, tableName) {
  const target = normalizeName(tableName);

  const tables = Array.isArray(schema?.tables)
    ? schema.tables
    : [];

  return tables.find(
    (table) => normalizeName(table.name) === target
  );
}

function getColumns(table) {
  if (!table || !Array.isArray(table.columns)) {
    return [];
  }

  return table.columns;
}

function getColumn(table, columnName) {
  const target = normalizeName(columnName);

  return getColumns(table).find(
    (column) => normalizeName(column.name) === target
  );
}

function makeFinding(code, message, details = {}) {
  return {
    code,
    message,
    ...details,
  };
}

function unsupportedResult(message) {
  return {
    status: "unsupported",
    supported: false,
    findings: [
      makeFinding("UNSUPPORTED_SQL", message),
    ],
  };
}

function validateSelectQuery(sql, schema) {
  if (typeof sql !== "string" || !sql.trim()) {
    return unsupportedResult("The SQL query is empty.");
  }

  let ast;

  try {
    ast = parser.astify(sql, { database: "MySQL" });
  } catch (error) {
    return unsupportedResult(
      `Could not parse this SQL query: ${error.message}`
    );
  }

  // Multiple statements are not supported by this validator.
  if (Array.isArray(ast)) {
    if (ast.length !== 1) {
      return unsupportedResult(
        "Multiple SQL statements are not supported."
      );
    }

    ast = ast[0];
  }

  if (!ast || ast.type !== "select") {
    return unsupportedResult(
      "Only SELECT queries are supported."
    );
  }

  // CTEs and UNION queries need additional handling.
  if (ast.with || ast._next) {
    return unsupportedResult(
      "Queries using CTEs or UNION are not supported yet."
    );
  }

  if (!Array.isArray(ast.from) || ast.from.length === 0) {
    return unsupportedResult(
      "SELECT queries without a FROM clause are not supported yet."
    );
  }

  const findings = [];
  const tableAliases = new Map();

  // Step 1: Resolve each table and its alias.
  for (const source of ast.from) {
    if (!source || typeof source.table !== "string") {
      return unsupportedResult(
        "Subqueries and derived tables in FROM are not supported yet."
      );
    }

    const tableName = normalizeName(source.table);
    const table = getTable(schema, tableName);

    if (!table) {
      findings.push(
        makeFinding(
          "TABLE_NOT_FOUND",
          `Table '${source.table}' does not exist in the connected database schema.`,
          { table: source.table }
        )
      );

      continue;
    }

    const alias = normalizeName(source.as || source.table);

    tableAliases.set(alias, {
      tableName: source.table,
      table,
    });
  }

  // Step 2: Validate a column reference against the schema.
  function validateColumn(node) {
    if (!node || node.type !== "column_ref") {
      return;
    }

    const columnName =
      typeof node.column === "string"
        ? node.column
        : "";

    // SELECT * and table.* are allowed.
    if (!columnName || columnName === "*") {
      return;
    }

    const qualifier = normalizeName(node.table);

    if (qualifier) {
      const resolved = tableAliases.get(qualifier);

      if (!resolved) {
        findings.push(
          makeFinding(
            "UNKNOWN_TABLE_ALIAS",
            `Table alias '${node.table}' is not defined in the FROM clause.`,
            {
              alias: node.table,
              column: columnName,
            }
          )
        );

        return;
      }

      if (!getColumn(resolved.table, columnName)) {
        findings.push(
          makeFinding(
            "COLUMN_NOT_FOUND",
            `Column '${columnName}' does not exist in table '${resolved.tableName}'.`,
            {
              table: resolved.tableName,
              column: columnName,
            }
          )
        );
      }

      return;
    }

    // An unqualified column must exist in exactly one source table.
    const matchingTables = [];

    for (const [alias, resolved] of tableAliases.entries()) {
      if (getColumn(resolved.table, columnName)) {
        matchingTables.push({ alias, ...resolved });
      }
    }

    if (matchingTables.length === 0) {
      findings.push(
        makeFinding(
          "COLUMN_NOT_FOUND",
          `Column '${columnName}' was not found in any table in the query.`,
          { column: columnName }
        )
      );
    } else if (matchingTables.length > 1) {
      findings.push(
        makeFinding(
          "AMBIGUOUS_COLUMN",
          `Column '${columnName}' exists in multiple tables. Specify its table alias.`,
          {
            column: columnName,
            tables: matchingTables.map(
              (item) => item.tableName
            ),
          }
        )
      );
    }
  }

  // Step 3: Traverse expressions and validate column references.
  // Do not traverse table definitions or unrelated metadata.
  function walkExpression(node) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        walkExpression(item);
      }
      return;
    }

    if (node.type === "column_ref") {
      validateColumn(node);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (
        key === "from" ||
        key === "table" ||
        key === "db" ||
        key === "as"
      ) {
        continue;
      }

      if (value && typeof value === "object") {
        walkExpression(value);
      }
    }
  }

  // SELECT expressions, JOIN conditions, WHERE, GROUP BY,
  // HAVING, ORDER BY and LIMIT expressions.
  walkExpression(ast.columns);

  for (const source of ast.from) {
    walkExpression(source.on);
  }

  walkExpression(ast.where);
  walkExpression(ast.groupby);
  walkExpression(ast.having);
  walkExpression(ast.orderby);
  walkExpression(ast.limit);

  // Remove duplicate findings.
  const uniqueFindings = [
    ...new Map(
      findings.map((finding) => [
        JSON.stringify(finding),
        finding,
      ])
    ).values(),
  ];

  return {
    status: uniqueFindings.length > 0 ? "invalid" : "valid",
    supported: true,
    findings: uniqueFindings,
  };
}

module.exports = {
  validateSelectQuery,
};
