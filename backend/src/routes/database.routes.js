const express = require("express");

const {
    testDatabaseConnection
} = require("../services/database.service");

const {
    createSession,
    deleteSession
} = require("../services/session.service");

const router = express.Router();

router.post("/connect", async (req, res) => {
    try {
        const {
            host,
            port,
            username,
            password,
            database
        } = req.body;

        // Basic input validation
        if (
            !host ||
            !port ||
            !username ||
            password === undefined ||
            !database
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all database connection details."
            });
        }

        const config = {
            host,
            port: Number(port),
            username,
            password,
            database
        };

        // Verify credentials before creating a session
        await testDatabaseConnection(config);

        // Store configuration on the backend
        const sessionId = createSession(config);

        res.json({
            success: true,
            message: "Database connected successfully",
            sessionId
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Database connection failed. Check your connection details."
        });
    }
});

router.post("/disconnect", (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "Session ID is required."
        });
    }

    const deleted = deleteSession(sessionId);

    res.json({
        success: true,
        message: deleted
            ? "Database disconnected successfully."
            : "Session was already disconnected or expired."
    });
});

module.exports = router;