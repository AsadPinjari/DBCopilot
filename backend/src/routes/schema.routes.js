const express = require("express");

const {
    getDatabaseSchema
} = require("../services/schema.service");

const {
    getSessionConfig
} = require("../services/session.service");

const router = express.Router();

router.post("/inspect", async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required."
            });
        }

        // Retrieve database configuration using the session ID
        const config = getSessionConfig(sessionId);

        if (!config) {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid. Please reconnect."
            });
        }

        // Inspect the database using the stored configuration
        const schema = await getDatabaseSchema(config);

        res.json({
            success: true,
            message: "Database schema fetched successfully",
            schema
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch database schema."
        });
    }
});

module.exports = router;