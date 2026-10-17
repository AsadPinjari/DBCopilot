const express = require("express");
const multer = require("multer");

const {
  analyzeProjectZip
} = require("../services/codebase.service");

const {
  validateSelectQuery
} = require("../services/sql-validation.service");

const {
  getSessionConfig
} = require("../services/session.service");

const {
  getDatabaseSchema
} = require("../services/schema.service");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const hasZipExtension = /\.zip$/i.test(file.originalname);

    if (!hasZipExtension) {
      return callback(
        new Error("Please upload a .zip project archive.")
      );
    }

    callback(null, true);
  }
});

router.post("/analyze", (req, res) => {
  upload.single("project")(
    req,
    res,
    async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          success: false,
          message: uploadError.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a project ZIP file."
        });
      }

      const { sessionId } = req.body || {};

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Please provide a database sessionId."
        });
      }

      try {
        const config = getSessionConfig(sessionId);

        if (!config) {
          return res.status(401).json({
            success: false,
            message:
              "Database session is invalid or expired. Please reconnect."
          });
        }

        // Read the actual schema from the connected database.
        const schema = await getDatabaseSchema(config);

        // Scan the uploaded project.
        const result = analyzeProjectZip(req.file.buffer);

        let queriesValidated = 0;
        let queriesInvalid = 0;
        let queriesUnsupported = 0;

        // Validate every extracted SQL candidate.
        for (const file of result.files) {
          for (const candidate of file.sqlCandidates) {
            candidate.validation = validateSelectQuery(
              candidate.sql,
              schema
            );

            if (candidate.validation.status === "unsupported") {
              queriesUnsupported++;
            } else {
              queriesValidated++;

              if (candidate.validation.status === "invalid") {
                queriesInvalid++;
              }
            }
          }
        }

        result.summary.queriesValidated = queriesValidated;
        result.summary.queriesInvalid = queriesInvalid;
        result.summary.queriesUnsupported = queriesUnsupported;

        return res.json({
          success: true,
          message: "Project scan and schema validation completed.",
          result
        });
      } catch (error) {
        console.error("Codebase analysis error:", error.message);

        return res.status(500).json({
          success: false,
          message: "Project analysis or schema validation failed."
        });
      }
    }
  );
});

module.exports = router;