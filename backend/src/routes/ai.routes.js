
const express = require("express");

const {
  getSessionConfig,
} = require("../services/session.service");

const {
  getDatabaseSchema,
} = require("../services/schema.service");

const {
  validateSelectQuery,
} = require("../services/sql-validation.service");

const {
  explainSqlFinding,
} = require("../services/ai.service");

const router = express.Router();

router.post("/explain", async (req, res) => {
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
      message: "Please provide the SQL query to explain.",
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

    // Use the real schema from the active database session.
    const schema = await getDatabaseSchema(config);

    // Never trust a validation result supplied by the frontend.
    const validation = validateSelectQuery(sql, schema);

    const aiResult = await explainSqlFinding({
      sql,
      validation,
      schema,
    });

    let suggestedValidation = null;

    if (aiResult.suggestedSql.trim()) {
      suggestedValidation = validateSelectQuery(
        aiResult.suggestedSql,
        schema
      );
    }

    return res.json({
      success: true,
      result: {
        originalSql: sql,
        validation,
        explanation: aiResult.explanation,
        reasoning: aiResult.reasoning,
        suggestedSql: aiResult.suggestedSql,
        suggestedValidation,
      },
    });
  } catch (error) {
    // Log the technical details locally, not the API key or credentials.
    console.error("AI explanation error:", error);
console.error("Error status:", error.status);
console.error("Error code:", error.code);

    if (
      error.message.includes("GEMINI_API_KEY is not configured")
    ) {
      return res.status(503).json({
        success: false,
        message: "AI is not configured. Add GEMINI_API_KEY to the backend .env file.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "The AI explanation could not be generated. Please try again.",
    });
  }
});

module.exports = router;
