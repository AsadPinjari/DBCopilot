const express = require("express");

const {
  getSessionConfig,
} = require("../services/session.service");

const {
  getDatabaseSchema,
} = require("../services/schema.service");

const { getAdapter } = require("../adapters");

const router = express.Router();

/**
 * POST /api/sql/validate
 * Validates a query against the live schema using the active database engine adapter.
 */
router.post("/validate", async (req, res) => {
  const { sessionId, sql } = req.body || {};

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a database sessionId.",
    });
  }

  if (typeof sql !== "string" || !sql.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide the SQL query to validate.",
    });
  }

  if (sql.length > 10000) {
    return res.status(400).json({
      success: false,
      message: "SQL query is too long. Maximum length is 10,000 characters.",
    });
  }

  try {
    const config = getSessionConfig(sessionId);

    if (!config) {
      return res.status(401).json({
        success: false,
        message: "Database session is invalid or expired. Please reconnect.",
      });
    }

    // Strip accidental outer quotes if copied directly from JS/Python code
    let cleanSql = sql.trim().replace(/[,;]\s*$/, "").trim();
    if (
      (cleanSql.startsWith('"') && cleanSql.endsWith('"')) ||
      (cleanSql.startsWith("'") && cleanSql.endsWith("'")) ||
      (cleanSql.startsWith("`") && cleanSql.endsWith("`"))
    ) {
      cleanSql = cleanSql.slice(1, -1).trim();
    }

    const adapter = getAdapter(config.engine || "mysql");
    const schema = await getDatabaseSchema(config);
    const validation = adapter.validateQuery(cleanSql, schema);

    return res.json({
      success: true,
      result: {
        sql: cleanSql,
        validation,
        engine: config.engine || "mysql",
        databaseName: config.database || config.filePath || "default",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("SQL validation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "SQL validation failed. Please try again.",
    });
  }
});

module.exports = router;
