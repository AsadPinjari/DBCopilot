require("dotenv").config();

const express = require("express");
const cors = require("cors");

const databaseRoutes = require("./routes/database.routes");
const schemaRoutes = require("./routes/schema.routes");
const codebaseRoutes = require("./routes/codebase.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.use(
    cors({
        origin: "http://localhost:3001"
    })
);

app.use(express.json());

app.use("/api/database", databaseRoutes);
app.use("/api/schema", schemaRoutes);
app.use("/api/codebase", codebaseRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "DBCopilot backend is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`DBCopilot backend running on port ${PORT}`);
});