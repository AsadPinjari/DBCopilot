
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

  // Strip accidental outer programming quotes if copied directly from JS/TS/Python string literals
  let cleanSql = sql.trim();
  cleanSql = cleanSql.replace(/[,;]\s*$/, "").trim();
  if (
    (cleanSql.startsWith('"') && cleanSql.endsWith('"')) ||
    (cleanSql.startsWith("'") && cleanSql.endsWith("'")) ||
    (cleanSql.startsWith("`") && cleanSql.endsWith("`"))
  ) {
    cleanSql = cleanSql.slice(1, -1).trim();
  }

  // Normalize PostgreSQL ($1) and named (:param) parameter markers for parser compatibility
  const normalizedSql = cleanSql
    .replace(/\$\d+/g, "?")
    .replace(/(?<=\s|[,(])(?::[a-zA-Z0-9_]+)(?=\s|[,);]|$)/g, "?");

  let ast;
  try {
    ast = parser.astify(normalizedSql, { database: "MySQL" });
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

  function validateScope(selectAst, parentAliases = new Map()) {
    if (!selectAst || selectAst.type !== "select") {
      return;
    }

    if (!Array.isArray(selectAst.from) || selectAst.from.length === 0) {
      findings.push(
        makeFinding("UNSUPPORTED_SQL", "SELECT queries without a FROM clause are not supported yet.")
      );
      return;
    }

    const currentAliases = new Map(parentAliases);
    const localAliases = new Map();

    // Step 1: Resolve each table in the current scope
    for (const source of selectAst.from) {
      if (!source || typeof source.table !== "string") {
        findings.push(
          makeFinding("UNSUPPORTED_SQL", "Subqueries and derived tables in FROM are not supported yet.")
        );
        return;
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
      const entry = {
        tableName: source.table,
        table,
      };

      localAliases.set(alias, entry);
      currentAliases.set(alias, entry);
    }

    // Step 2: Validate a column reference in this scope
    function validateColumn(node) {
      if (!node || node.type !== "column_ref") {
        return;
      }

      const columnName =
        typeof node.column === "string" ? node.column : "";
      const qualifier = normalizeName(node.table);

      if (columnName === "*") {
        if (qualifier && !currentAliases.has(qualifier)) {
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
        }
        return;
      }

      if (!columnName) {
        return;
      }

      if (qualifier) {
        const resolved = currentAliases.get(qualifier);
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

      // Check local scope first to avoid cross-scope ambiguity
      const matchingLocal = [];
      for (const [alias, resolved] of localAliases.entries()) {
        if (getColumn(resolved.table, columnName)) {
          matchingLocal.push({ alias, ...resolved });
        }
      }

      if (matchingLocal.length === 1) {
        return;
      }

      if (matchingLocal.length > 1) {
        findings.push(
          makeFinding(
            "AMBIGUOUS_COLUMN",
            `Column '${columnName}' exists in multiple tables. Specify its table alias.`,
            {
              column: columnName,
              tables: matchingLocal.map((item) => item.tableName),
            }
          )
        );
        return;
      }

      // Check outer parent scope for correlated references
      const matchingParent = [];
      for (const [alias, resolved] of parentAliases.entries()) {
        if (getColumn(resolved.table, columnName)) {
          matchingParent.push({ alias, ...resolved });
        }
      }

      if (matchingParent.length === 1) {
        return;
      }

      if (matchingParent.length > 1) {
        findings.push(
          makeFinding(
            "AMBIGUOUS_COLUMN",
            `Column '${columnName}' exists in multiple tables. Specify its table alias.`,
            {
              column: columnName,
              tables: matchingParent.map((item) => item.tableName),
            }
          )
        );
        return;
      }

      findings.push(
        makeFinding(
          "COLUMN_NOT_FOUND",
          `Column '${columnName}' was not found in any table in the query.`,
          { column: columnName }
        )
      );
    }

    // Step 3: Traverse expressions within this scope
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

      // Recursively validate subquery with child scope
      if (node.ast && typeof node.ast === "object" && node.ast.type === "select") {
        validateScope(node.ast, currentAliases);
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

    walkExpression(selectAst.columns);

    for (const source of selectAst.from) {
      if (source && source.on) {
        walkExpression(source.on);
      }
    }

    walkExpression(selectAst.where);
    walkExpression(selectAst.groupby);
    walkExpression(selectAst.having);
    walkExpression(selectAst.orderby);
    walkExpression(selectAst.limit);
  }

  validateScope(ast);

  // Remove duplicate findings.
  const uniqueFindings = [
    ...new Map(
      findings.map((finding) => [
        JSON.stringify(finding),
        finding,
      ])
    ).values(),
  ];

  const hasUnsupported = uniqueFindings.some((f) => f.code === "UNSUPPORTED_SQL");

  return {
    status: hasUnsupported
      ? "unsupported"
      : uniqueFindings.length > 0
      ? "invalid"
      : "valid",
    supported: !hasUnsupported,
    findings: uniqueFindings,
  };
}

module.exports = {
  validateSelectQuery,
};
