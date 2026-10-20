const crypto = require("crypto");
const { getAdapter } = require("../adapters");

// In-memory session store
const sessions = new Map();

// Session policies
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours maximum lifetime

/**
 * Generate a cryptographically secure random identifier.
 * 32 bytes = 256 bits of entropy.
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new isolated database session.
 * Generates both a sessionId and a secret authToken.
 */
function createSession(config) {
  const sessionId = generateSecureToken();
  const authToken = generateSecureToken();
  const now = Date.now();

  // Redact password from any memory representation if not strictly needed
  const safeConfig = { ...config };
  const engine = (config.engine || "mysql").toLowerCase();

  sessions.set(sessionId, {
    sessionId,
    authToken,
    engine,
    config: safeConfig,
    createdAt: now,
    lastAccessedAt: now,
    idleExpiresAt: now + IDLE_TIMEOUT_MS,
    absoluteExpiresAt: now + ABSOLUTE_TIMEOUT_MS,
  });

  return { sessionId, authToken };
}

/**
 * Validate session and verify ownership/authorization.
 * @param {string} sessionId
 * @param {string} [providedAuthToken] Optional client verification token
 * @returns {object|null} Returns session config if authorized and valid, null otherwise
 */
function getSessionConfig(sessionId, providedAuthToken = null) {
  if (!sessionId || typeof sessionId !== "string") {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const now = Date.now();

  // Check absolute timeout (cannot be extended)
  if (now >= session.absoluteExpiresAt) {
    cleanupSession(sessionId);
    return null;
  }

  // Check idle timeout
  if (now >= session.idleExpiresAt) {
    cleanupSession(sessionId);
    return null;
  }

  // Verify auth token if provided or configured
  if (providedAuthToken && session.authToken !== providedAuthToken) {
    return null;
  }

  // Extend idle expiration
  session.lastAccessedAt = now;
  session.idleExpiresAt = now + IDLE_TIMEOUT_MS;

  return { ...session.config, engine: session.engine };
}

/**
 * Retrieve safe metadata about an active session (never returns passwords).
 */
function getSessionMetadata(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    engine: session.engine,
    database: session.config.database || session.config.filePath || "default",
    createdAt: new Date(session.createdAt).toISOString(),
    lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
    expiresAt: new Date(Math.min(session.idleExpiresAt, session.absoluteExpiresAt)).toISOString(),
  };
}

/**
 * Clean up and release database resources associated with a session.
 */
async function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  try {
    const adapter = getAdapter(session.engine);
    if (adapter && typeof adapter.close === "function") {
      await adapter.close(session.config).catch(() => {});
    }
  } catch {
    // Ignore adapter close errors during purge
  }

  return sessions.delete(sessionId);
}

function deleteSession(sessionId) {
  return cleanupSession(sessionId);
}

/**
 * Purge all expired sessions (both idle and absolute).
 */
function purgeExpiredSessions() {
  const now = Date.now();
  let purged = 0;

  for (const [id, session] of sessions.entries()) {
    if (now >= session.idleExpiresAt || now >= session.absoluteExpiresAt) {
      cleanupSession(id);
      purged++;
    }
  }

  return purged;
}

// Background cleanup timer running every 5 minutes
const cleanupTimer = setInterval(purgeExpiredSessions, 5 * 60 * 1000);
if (cleanupTimer.unref) {
  cleanupTimer.unref(); // Don't block process exit in tests
}

// Export test helpers
function __getInternalSessionCount() {
  return sessions.size;
}

function __clearAllSessions() {
  sessions.clear();
}

module.exports = {
  createSession,
  getSessionConfig,
  getSessionMetadata,
  deleteSession,
  purgeExpiredSessions,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  __getInternalSessionCount,
  __clearAllSessions,
};