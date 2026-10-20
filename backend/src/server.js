require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  rateLimiter,
  securityHeaders,
  globalErrorHandler,
} = require("./middleware/security");

const databaseRoutes = require("./routes/database.routes");
const schemaRoutes = require("./routes/schema.routes");
const codebaseRoutes = require("./routes/codebase.routes");
const aiRoutes = require("./routes/ai.routes");
const sqlRoutes = require("./routes/sql.routes");
const extensionRoutes = require("./routes/extension.routes");

const app = express();

// Parse allowed CORS origins (single or comma-separated)
const rawOrigins = process.env.FRONTEND_ORIGIN || "http://localhost:3001,http://localhost:3000";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, VS Code extension)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-mode permissive fallback
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Mount security headers and rate limiter
app.use(securityHeaders);
app.use(rateLimiter);

// Limit JSON body size to prevent payload exhaustion
app.use(express.json({ limit: "2mb" }));

// Mount API routes
app.use("/api/database", databaseRoutes);
app.use("/api/schema", schemaRoutes);
app.use("/api/codebase", codebaseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/sql", sqlRoutes);
app.use("/api/extension", extensionRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "DBCopilot backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("DBCopilot backend running on port " + PORT);
  console.log("Allowed origins: " + allowedOrigins.join(", "));
});
