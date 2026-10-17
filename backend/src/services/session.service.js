const { randomUUID } = require("crypto");

// Temporary in-memory session storage
const sessions = new Map();

// Session expires after 30 minutes
const SESSION_DURATION = 30 * 60 * 1000;

function createSession(config) {
    const sessionId = randomUUID();

    sessions.set(sessionId, {
        config: { ...config },
        expiresAt: Date.now() + SESSION_DURATION
    });

    return sessionId;
}

function getSessionConfig(sessionId) {
    if (!sessionId) {
        return null;
    }

    const session = sessions.get(sessionId);

    if (!session) {
        return null;
    }

    // Remove expired sessions
    if (Date.now() >= session.expiresAt) {
        sessions.delete(sessionId);
        return null;
    }

    // Extend the session after successful use
    session.expiresAt = Date.now() + SESSION_DURATION;

    return { ...session.config };
}

function deleteSession(sessionId) {
    return sessions.delete(sessionId);
}

module.exports = {
    createSession,
    getSessionConfig,
    deleteSession
};