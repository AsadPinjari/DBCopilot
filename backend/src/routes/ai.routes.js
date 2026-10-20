
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
  chatWithCopilot,
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

router.post("/chat", async (req, res) => {
  const { sessionId, message, history } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter a message.",
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Message is too long. Maximum length is 5,000 characters.",
    });
  }

  if (
    history !== undefined &&
    (!Array.isArray(history) || history.length > 50)
  ) {
    return res.status(400).json({
      success: false,
      message: "Conversation history must be an array of at most 50 messages.",
    });
  }

  try {
    let schema = null;

    // If a database session is supplied, use its actual schema.
    if (sessionId !== undefined) {
      if (typeof sessionId !== "string" || !sessionId.trim()) {
        return res.status(400).json({
          success: false,
          message: "The database sessionId is invalid.",
        });
      }

      const config = getSessionConfig(sessionId);

      if (!config) {
        return res.status(401).json({
          success: false,
          message: "Database session expired. Please reconnect.",
        });
      }

      schema = await getDatabaseSchema(config);
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map((item) => ({
          role: item?.role === "model" ? "model" : "user",
          text: String(item?.text || "").slice(0, 3000),
        }))
      : [];

    const result = await chatWithCopilot({
      message: message.trim(),
      schema,
      history: safeHistory,
    });

    return res.json({
      success: true,
      answer: result.answer,
    });
  } catch (error) {
    console.error("AI chat error:", error.message);

    if (error.message.includes("GEMINI_API_KEY is not configured")) {
      return res.status(503).json({
        success: false,
        message: "AI is not configured. Check the backend GEMINI_API_KEY.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "The AI response could not be generated. Please try again.",
    });
  }
});

module.exports = router;
