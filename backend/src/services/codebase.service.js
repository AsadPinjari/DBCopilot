
const AdmZip = require("adm-zip");
const path = require("path");

const MAX_FILES = 1000;
const MAX_SOURCE_FILE_SIZE = 1024 * 1024; // 1 MB per source file
const MAX_TOTAL_SOURCE_SIZE = 10 * 1024 * 1024; // 10 MB scanned source

const SOURCE_EXTENSIONS = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".sql"
]);

const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".venv",
    "vendor"
]);

function isSupportedSource(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return SOURCE_EXTENSIONS.has(extension);
}

function shouldIgnore(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    const parts = normalized.split("/");

    // Avoid scanning generated, dependency, and hidden directories.
    if (parts.some(part => IGNORED_DIRECTORIES.has(part))) {
        return true;
    }

    if (parts.some(part => part.startsWith("."))) {
        return true;
    }

    return false;
}

function isDatabaseRelated(source) {
    return (
        /\bSELECT\b|\bINSERT\s+INTO\b|\bUPDATE\b|\bDELETE\s+FROM\b/i.test(source) ||
        /\b(mysql2?|pg|sequelize|knex|prisma|drizzle|mongoose)\b/i.test(source) ||
        /\.query\s*\(|\.execute\s*\(|\$queryRaw\b|\$executeRaw\b/i.test(source)
    );
}


function extractSqlCandidates(source, filePath = "") {
  const candidates = [];
  const extension = path.extname(filePath).toLowerCase();

  // SQL files contain statements directly, without quotes.
  if (extension === ".sql") {
    const lines = source.split("\n");
    let statement = "";
    let startLine = 1;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!statement && trimmed) {
        startLine = index + 1;
      }

      statement += (statement ? "\n" : "") + line;

      // Basic statement boundary detection.
      if (trimmed.endsWith(";")) {
        const sql = statement.trim();

        if (/^(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(sql)) {
          candidates.push({
            sql,
            line: startLine,
            extraction: "SQL file statement"
          });
        }

        statement = "";
      }
    });

    // Also handle a final statement without a semicolon.
    const remaining = statement.trim();

    if (
      remaining &&
      /^(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(remaining)
    ) {
      candidates.push({
        sql: remaining,
        line: startLine,
        extraction: "SQL file statement"
      });
    }

    return candidates;
  }

  // For JavaScript/TypeScript, keep the existing string-literal approach.
  const pattern =
    /(["'`])((?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b[\s\S]*?)\1/gi;

  let match;

  while ((match = pattern.exec(source)) !== null) {
    const sql = match[2].trim();

    if (sql) {
      const line = source.slice(0, match.index).split("\n").length;

      candidates.push({
        sql,
        line,
        extraction: "string-literal heuristic"
      });
    }
  }

  return candidates;
}


function analyzeProjectZip(buffer) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    if (entries.length > MAX_FILES) {
        throw new Error(
            `The archive contains too many entries. Maximum: ${MAX_FILES}.`
        );
    }

    const files = [];
    const totalUncompressedSize = entries.reduce(
        (total, entry) => total + (entry.header.size || 0),
        0
    );

    // Check the archive's declared expanded size before reading file content.
    if (totalUncompressedSize > 50 * 1024 * 1024) {
        throw new Error("The expanded archive is too large to analyze.");
    }

    let totalScannedBytes = 0;

    for (const entry of entries) {
        if (entry.isDirectory) continue;

        const filePath = entry.entryName.replace(/\\/g, "/");

        // Reject unsafe paths, including absolute paths and traversal.
        if (
            filePath.startsWith("/") ||
            /^[a-zA-Z]:/.test(filePath) ||
            filePath.split("/").some(part => part === "..")
        ) {
            continue;
        }

        if (shouldIgnore(filePath)) continue;
        if (!isSupportedSource(filePath)) continue;

        if (entry.header.size > MAX_SOURCE_FILE_SIZE) continue;

        totalScannedBytes += entry.header.size;

        if (totalScannedBytes > MAX_TOTAL_SOURCE_SIZE) {
            throw new Error("The total source size exceeds the analysis limit.");
        }

        const content = entry.getData().toString("utf8");

        // Ignore files containing NUL bytes, which are likely binary.
        if (content.includes("\0")) continue;

        const databaseRelated = isDatabaseRelated(content);

        if (!databaseRelated && path.extname(filePath).toLowerCase() !== ".sql") {
            continue;
        }

        files.push({
            path: filePath,
            language: path.extname(filePath).slice(1),
            databaseRelated,
            sqlCandidates: extractSqlCandidates(content, filePath)
        });
    }

    return {
        summary: {
            filesAnalyzed: files.length,
            filesWithDatabaseCode: files.filter(file => file.databaseRelated).length,
            sqlCandidatesFound: files.reduce(
                (total, file) => total + file.sqlCandidates.length,
                0
            )
        },
        files
    };
}

function analyzeProjectFiles(fileList) {
    if (!Array.isArray(fileList)) {
        throw new Error("fileList must be an array of { path, content } objects.");
    }

    if (fileList.length > MAX_FILES) {
        throw new Error(`The file list contains too many items. Maximum: ${MAX_FILES}.`);
    }

    const files = [];
    let totalScannedBytes = 0;

    for (const item of fileList) {
        if (!item || typeof item.path !== "string" || typeof item.content !== "string") {
            continue;
        }

        const filePath = item.path.replace(/\\/g, "/");

        // Reject unsafe paths, including absolute paths and traversal.
        if (
            filePath.startsWith("/") ||
            /^[a-zA-Z]:/.test(filePath) ||
            filePath.split("/").some(part => part === "..")
        ) {
            continue;
        }

        if (shouldIgnore(filePath)) continue;
        if (!isSupportedSource(filePath)) continue;

        const content = item.content;
        const byteLength = Buffer.byteLength(content, "utf8");

        if (byteLength > MAX_SOURCE_FILE_SIZE) continue;

        totalScannedBytes += byteLength;
        if (totalScannedBytes > MAX_TOTAL_SOURCE_SIZE) {
            throw new Error("The total source size exceeds the analysis limit.");
        }

        if (content.includes("\0")) continue;

        const databaseRelated = isDatabaseRelated(content);
        if (!databaseRelated && path.extname(filePath).toLowerCase() !== ".sql") {
            continue;
        }

        files.push({
            path: filePath,
            language: path.extname(filePath).slice(1),
            databaseRelated,
            sqlCandidates: extractSqlCandidates(content, filePath)
        });
    }

    return {
        summary: {
            filesAnalyzed: files.length,
            filesWithDatabaseCode: files.filter(file => file.databaseRelated).length,
            sqlCandidatesFound: files.reduce(
                (total, file) => total + file.sqlCandidates.length,
                0
            )
        },
        files
    };
}

module.exports = {
    analyzeProjectZip,
    analyzeProjectFiles
};
