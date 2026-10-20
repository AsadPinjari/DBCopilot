const express = require("express");
const multer = require("multer");

const {
  analyzeProjectZip,
  analyzeProjectFiles,
} = require("../services/codebase.service");

const {
  getAdapter,
} = require("../adapters");

const {
  getSessionConfig,
} = require("../services/session.service");

const {
  getDatabaseSchema,
} = require("../services/schema.service");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const hasZipExtension = /\.zip$/i.test(file.originalname);

    if (!hasZipExtension) {
      return callback(
        new Error("Please upload a .zip project archive.")
      );
    }

    callback(null, true);
  },
});

/**
 * Validate all extracted SQL candidates in an analysis result against the live schema.
 */
function validateCodebaseResult(result, schema, config) {
  let queriesValidated = 0;
  let queriesValid = 0;
  let queriesInvalid = 0;
  let queriesUnsupported = 0;

  const adapter = getAdapter(config.engine || "mysql");

  for (const file of result.files) {
    for (const candidate of file.sqlCandidates) {
      candidate.validation = adapter.validateQuery(
        candidate.sql,
        schema
      );

      if (candidate.validation.status === "unsupported") {
        queriesUnsupported++;
      } else {
        queriesValidated++;

        if (candidate.validation.status === "invalid") {
          queriesInvalid++;
        } else {
          queriesValid++;
        }
      }
    }
  }

  result.summary.queriesValidated = queriesValidated;
  result.summary.queriesValid = queriesValid;
  result.summary.queriesInvalid = queriesInvalid;
  result.summary.queriesUnsupported = queriesUnsupported;
  result.meta = {
    timestamp: new Date().toISOString(),
    databaseName: config.database,
    engine: "mysql",
  };

  return result;
}

/**
 * POST /api/codebase/analyze
 * Scans a ZIP archive uploaded from web or API client.
 */
router.post("/analyze", (req, res) => {
  upload.single("project")(
    req,
    res,
    async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          success: false,
          message: uploadError.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a project ZIP file.",
        });
      }

      const { sessionId } = req.body || {};

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Please provide a database sessionId.",
        });
      }

      try {
        const config = getSessionConfig(sessionId);

        if (!config) {
          return res.status(401).json({
            success: false,
            message:
              "Database session is invalid or expired. Please reconnect.",
          });
        }

        const schema = await getDatabaseSchema(config);
        const result = analyzeProjectZip(req.file.buffer);
        const validated = validateCodebaseResult(result, schema, config);

        return res.json({
          success: true,
          message: "Project scan and schema validation completed.",
          result: validated,
        });
      } catch (error) {
        console.error("Codebase analysis error:", error.message);

        return res.status(500).json({
          success: false,
          message: "Project analysis or schema validation failed.",
        });
      }
    }
  );
});

/**
 * POST /api/codebase/analyze-files
 * Scans an array of source files [{ path, content }] directly (ideal for IDE extension).
 */
router.post("/analyze-files", async (req, res) => {
  const { sessionId, files } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "Please provide a database sessionId.",
    });
  }

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide a non-empty array of files to analyze.",
    });
  }

  try {
    const config = getSessionConfig(sessionId);

    if (!config) {
      return res.status(401).json({
        success: false,
        message: "Database session is invalid or expired. Please reconnect.",
      });
    }

    const schema = await getDatabaseSchema(config);
    const result = analyzeProjectFiles(files);
    const validated = validateCodebaseResult(result, schema, config);

    return res.json({
      success: true,
      message: "Workspace files analysis and schema validation completed.",
      result: validated,
    });
  } catch (error) {
    console.error("Workspace file analysis error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze workspace files.",
    });
  }
});

module.exports = router;