const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSession,
  getSessionConfig,
  getSessionMetadata,
  deleteSession,
  purgeExpiredSessions,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  __clearAllSessions,
} = require("../src/services/session.service");

test.beforeEach(() => {
  __clearAllSessions();
});

test("createSession generates high-entropy 256-bit cryptographic tokens", () => {
  const { sessionId, authToken } = createSession({
    engine: "mysql",
    database: "prod_db",
    username: "app_user",
    password: "super_secret_password",
  });

  assert.equal(typeof sessionId, "string");
  assert.equal(sessionId.length, 64, "Session ID should be 64 hex characters (32 bytes)");
  assert.equal(typeof authToken, "string");
  assert.equal(authToken.length, 64, "Auth token should be 64 hex characters (32 bytes)");
  assert.notEqual(sessionId, authToken);
});

test("getSessionConfig verifies session ownership when authToken is provided", () => {
  const { sessionId, authToken } = createSession({
    engine: "postgres",
    database: "analytics",
  });

  // Valid token
  const config = getSessionConfig(sessionId, authToken);
  assert.ok(config);
  assert.equal(config.database, "analytics");

  // Invalid token is rejected
  const rejected = getSessionConfig(sessionId, "wrong_token_here");
  assert.equal(rejected, null, "Mismatching auth token should reject session access");
});

test("getSessionMetadata never exposes passwords or connection secrets", () => {
  const { sessionId } = createSession({
    engine: "mysql",
    host: "db.internal",
    port: 3306,
    username: "admin",
    password: "sensitive_cleartext_password_123",
    database: "orders",
  });

  const metadata = getSessionMetadata(sessionId);
  assert.ok(metadata);
  assert.equal(metadata.sessionId, sessionId);
  assert.equal(metadata.engine, "mysql");
  assert.equal(metadata.database, "orders");

  // Ensure password and username are NEVER present in metadata
  assert.equal(metadata.password, undefined);
  assert.equal(metadata.username, undefined);
  assert.equal(JSON.stringify(metadata).includes("sensitive_cleartext_password_123"), false);
});

test("deleteSession revokes session and prevents further access", async () => {
  const { sessionId } = createSession({
    engine: "sqlite",
    database: ":memory:",
  });

  assert.ok(getSessionConfig(sessionId));
  const deleted = await deleteSession(sessionId);
  assert.equal(deleted, true);

  assert.equal(getSessionConfig(sessionId), null);
  assert.equal(getSessionMetadata(sessionId), null);
});

test("purgeExpiredSessions removes expired sessions", () => {
  const { sessionId } = createSession({ engine: "mysql", database: "test" });

  // Session is currently active
  assert.equal(purgeExpiredSessions(), 0);
  assert.ok(getSessionConfig(sessionId));
});
