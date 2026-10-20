const express = require("express");

const {
  getDatabaseSchema,
} = require("../services/schema.service");

const {
  getSessionConfig,
} = require("../services/session.service");

const {
  normalizeSchemaSnapshot,
  compareSchemas,
  analyzeMigrationSql,
} = require("../services/drift.service");

const router = express.Router();

/**
 * POST /api/schema/inspect
 * Inspects the live schema for the connected database session.
 */
router.post("/inspect", async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const config = getSessionConfig(sessionId);

    if (!config) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please reconnect.",
      });
    }

    const schema = await getDatabaseSchema(config);

    res.json({
      success: true,
      message: "Database schema fetched successfully",
      schema,
    });
  } catch (error) {
    console.error("Schema inspect error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch database schema.",
    });
  }
});

/**
 * POST /api/schema/snapshot
 * Generates a normalized snapshot of the live database schema.
 */
router.post("/snapshot", async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const config = getSessionConfig(sessionId);

    if (!config) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please reconnect.",
      });
    }

    const schema = await getDatabaseSchema(config);
    const snapshot = normalizeSchemaSnapshot(schema);

    res.json({
      success: true,
      message: "Schema snapshot created successfully.",
      snapshot,
    });
  } catch (error) {
    console.error("Snapshot error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create schema snapshot.",
    });
  }
});

/**
 * POST /api/schema/compare
 * Compares a baseline snapshot against the live database (or another snapshot).
 */
router.post("/compare", async (req, res) => {
  try {
    const { sessionId, baseSnapshot, currentSnapshot, applicationAnalysis } =
      req.body || {};

    if (!baseSnapshot) {
      return res.status(400).json({
        success: false,
        message: "baseSnapshot is required for comparison.",
      });
    }

    let targetSnapshot = currentSnapshot;

    if (!targetSnapshot && sessionId) {
      const config = getSessionConfig(sessionId);
      if (!config) {
        return res.status(401).json({
          success: false,
          message: "Session expired or invalid. Please reconnect.",
        });
      }
      const schema = await getDatabaseSchema(config);
      targetSnapshot = normalizeSchemaSnapshot(schema);
    }

    if (!targetSnapshot) {
      return res.status(400).json({
        success: false,
        message:
          "Provide either a currentSnapshot or a valid sessionId to compare against.",
      });
    }

    const driftReport = compareSchemas(
      baseSnapshot,
      targetSnapshot,
      applicationAnalysis
    );

    res.json({
      success: true,
      report: driftReport,
    });
  } catch (error) {
    console.error("Drift compare error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to compare schemas.",
    });
  }
});

/**
 * POST /api/schema/analyze-migration
 * Analyzes migration SQL for dangerous schema operations and risks.
 */
router.post("/analyze-migration", async (req, res) => {
  try {
    const { sql } = req.body || {};

    if (!sql || typeof sql !== "string") {
      return res.status(400).json({
        success: false,
        message: "SQL script is required.",
      });
    }

    const operations = analyzeMigrationSql(sql);

    res.json({
      success: true,
      operations,
      hasDangerousOperations: operations.some(
        (op) => op.severity === "CRITICAL" || op.severity === "HIGH"
      ),
    });
  } catch (error) {
    console.error("Migration analyze error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to analyze migration SQL.",
    });
  }
});

module.exports = router;