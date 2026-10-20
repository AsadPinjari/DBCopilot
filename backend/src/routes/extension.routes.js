const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Strict path to the known VSIX artifact only
const VSIX_PATH = path.resolve(
  __dirname,
  "../../..",
  "vscode-extension",
  "dbcopilot-1.0.0.vsix"
);

const MANIFEST_PATH = path.resolve(
  __dirname,
  "../../..",
  "vscode-extension",
  "package.json"
);

/**
 * GET /api/extension/info
 * Returns extension metadata, availability, and supported features.
 */
router.get("/info", (req, res) => {
  try {
    const vsixExists = fs.existsSync(VSIX_PATH);
    let stats = null;
    if (vsixExists) {
      stats = fs.statSync(VSIX_PATH);
    }

    let manifest = {
      name: "dbcopilot",
      displayName: "DB Copilot",
      version: "1.0.0",
      engines: { vscode: "^1.85.0" },
    };

    if (fs.existsSync(MANIFEST_PATH)) {
      try {
        manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
      } catch (err) {
        // Fall back to default manifest
      }
    }

    res.json({
      success: true,
      available: vsixExists,
      filename: "dbcopilot-1.0.0.vsix",
      name: manifest.name,
      displayName: manifest.displayName || "DB Copilot",
      version: manifest.version || "1.0.0",
      targetEngine: manifest.engines?.vscode || "^1.85.0",
      sizeBytes: stats ? stats.size : 0,
      sizeFormatted: stats ? `${(stats.size / 1024).toFixed(1)} KB` : "N/A",
      downloadUrl: "/api/extension/download",
      backendUrl: `http://localhost:${process.env.PORT || 5000}`,
      commands: [
        { id: "dbcopilot.analyzeWorkspace", title: "DB Copilot: Analyze Workspace" },
        { id: "dbcopilot.connect", title: "DB Copilot: Connect Database" },
        { id: "dbcopilot.validateSelection", title: "DB Copilot: Validate Selected SQL" },
        { id: "dbcopilot.explainSelection", title: "DB Copilot: Explain Selected SQL with AI" },
        { id: "dbcopilot.compareSchemaDrift", title: "DB Copilot: Compare Schema Drift" },
        { id: "dbcopilot.showCapabilities", title: "DB Copilot: Show Engine Capabilities" },
      ],
      settings: [
        { key: "dbcopilot.serverUrl", default: "http://localhost:5000", description: "URL of the DB Copilot backend API server." },
        { key: "dbcopilot.sessionId", default: "", description: "Active database session ID for schema context." },
        { key: "dbcopilot.autoAnalyzeOnSave", default: true, description: "Automatically re-run analysis on save." },
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to retrieve extension info: ${error.message}`,
    });
  }
});

/**
 * GET /api/extension/download
 * Secure, narrowly-scoped file stream for the pre-built VSIX artifact.
 * Does not accept user path inputs to prevent directory traversal.
 */
router.get("/download", (req, res) => {
  if (!fs.existsSync(VSIX_PATH)) {
    return res.status(404).json({
      success: false,
      message:
        "The VSIX package 'dbcopilot-1.0.0.vsix' was not found. Please run 'npm run package' in the vscode-extension folder.",
    });
  }

  const stat = fs.statSync(VSIX_PATH);

  res.setHeader("Content-Type", "application/vnd.code.vsix");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="dbcopilot-1.0.0.vsix"'
  );
  res.setHeader("Content-Length", stat.size);

  const readStream = fs.createReadStream(VSIX_PATH);
  readStream.pipe(res);
});

module.exports = router;
