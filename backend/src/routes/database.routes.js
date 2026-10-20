const express = require("express");

const {
  testDatabaseConnection,
} = require("../services/database.service");

const {
  createSession,
  deleteSession,
  getSessionMetadata,
} = require("../services/session.service");

const { listCapabilities, getAdapter } = require("../adapters");

const router = express.Router();

/**
 * GET /api/database/capabilities
 * Returns the honest capability support matrix across all database engines.
 */
router.get("/capabilities", (req, res) => {
  const capabilities = listCapabilities();
  res.json({
    success: true,
    capabilities,
  });
});

/**
 * GET /api/database/session/:sessionId
 * Returns safe metadata about an active session without revealing credentials.
 */
router.get("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const metadata = getSessionMetadata(sessionId);

  if (!metadata) {
    return res.status(404).json({
      success: false,
      message: "Session not found, expired, or revoked.",
    });
  }

  res.json({
    success: true,
    session: metadata,
  });
});

/**
 * POST /api/database/connect
 * Validates credentials against live database and creates a cryptographically secured session.
 */
router.post("/connect", async (req, res) => {
  try {
    const {
      engine = "mysql",
      host,
      port,
      username,
      password,
      database,
      filePath,
      filepath,
      uri,
      ssl,
    } = req.body || {};

    const normalizedEngine = String(engine).toLowerCase();
    const resolvedPath = filePath || filepath || database;

    // Engine-specific connection input validation
    if (normalizedEngine === "sqlite") {
      if (!resolvedPath) {
        return res.status(400).json({
          success: false,
          message: "Please provide a database file path for SQLite.",
        });
      }
    } else if (normalizedEngine === "redis") {
      // Redis can use default localhost:6379 or URI
    } else if (normalizedEngine === "mongodb") {
      if (!uri && !host) {
        return res.status(400).json({
          success: false,
          message: "Please provide MongoDB host or connection URI.",
        });
      }
    } else {
      // Standard relational databases (MySQL, PostgreSQL, MariaDB)
      if (!host || !username || password === undefined || !database) {
        return res.status(400).json({
          success: false,
          message: `Please provide host, username, password, and database for ${engine.toUpperCase()}.`,
        });
      }
    }

    const config = {
      engine: normalizedEngine,
      host,
      port: port ? Number(port) : undefined,
      username,
      password,
      database,
      filePath: resolvedPath,
      uri,
      ssl,
    };

    // Verify database connectivity before creating session
    await testDatabaseConnection(config);

    // Create session with cryptographically secure ID and client token
    const { sessionId, authToken } = createSession(config);

    res.json({
      success: true,
      message: `Connected to ${normalizedEngine.toUpperCase()} database successfully.`,
      sessionId,
      authToken,
      engine: normalizedEngine,
    });
  } catch (error) {
    let sanitized = error.message || "Database connection failed.";
    sanitized = sanitized
      .replace(/password(=|:\s*)[^\s;&]+/gi, "password=***")
      .replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:***@");

    res.status(400).json({
      success: false,
      message: `Database connection failed: ${sanitized}`,
    });
  }
});

/**
 * POST /api/database/disconnect
 * Closes connections and purges session from memory.
 */
router.post("/disconnect", async (req, res) => {
  const { sessionId } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "Session ID is required.",
    });
  }

  const deleted = await deleteSession(sessionId);

  res.json({
    success: true,
    message: deleted
      ? "Database disconnected successfully and resources released."
      : "Session was already disconnected or expired.",
  });
});

module.exports = router;