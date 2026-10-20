"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFindingMessage = formatFindingMessage;
exports.updateDiagnostics = updateDiagnostics;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
function formatFindingMessage(finding) {
    if (typeof finding === "string") {
        return {
            message: finding,
            code: "SQL_VALIDATION",
            severity: vscode.DiagnosticSeverity.Warning,
        };
    }
    if (!finding || typeof finding !== "object") {
        return {
            message: String(finding),
            code: "UNKNOWN",
            severity: vscode.DiagnosticSeverity.Information,
        };
    }
    const f = finding;
    if (f.code === "TABLE_NOT_FOUND" && f.table) {
        return {
            message: `Table "${f.table}" does not exist in the connected database schema.`,
            code: "TABLE_NOT_FOUND",
            severity: vscode.DiagnosticSeverity.Error,
        };
    }
    if (f.code === "COLUMN_NOT_FOUND" && f.column) {
        const tblInfo = f.table ? ` in table "${f.table}"` : "";
        return {
            message: `Column "${f.column}" does not exist${tblInfo}.`,
            code: "COLUMN_NOT_FOUND",
            severity: vscode.DiagnosticSeverity.Error,
        };
    }
    if (f.code === "UNKNOWN_TABLE_ALIAS" && f.alias) {
        return {
            message: `Unknown table alias "${f.alias}".`,
            code: "UNKNOWN_TABLE_ALIAS",
            severity: vscode.DiagnosticSeverity.Error,
        };
    }
    if (f.code === "AMBIGUOUS_COLUMN" && f.column) {
        const tbls = (f.tables || []).join(", ");
        return {
            message: `Ambiguous column "${f.column}" — present in multiple tables: ${tbls}.`,
            code: "AMBIGUOUS_COLUMN",
            severity: vscode.DiagnosticSeverity.Warning,
        };
    }
    if (f.message) {
        return {
            message: f.message,
            code: f.code || "SQL_ERROR",
            severity: vscode.DiagnosticSeverity.Error,
        };
    }
    return {
        message: JSON.stringify(finding),
        code: "SCHEMA_VALIDATION",
        severity: vscode.DiagnosticSeverity.Warning,
    };
}
function updateDiagnostics(collection, analysisResult, workspaceRootUri) {
    // Clear existing diagnostics managed by DB Copilot
    collection.clear();
    if (!analysisResult || !Array.isArray(analysisResult.files)) {
        return;
    }
    const diagnosticsByFile = new Map();
    for (const file of analysisResult.files) {
        let targetUri;
        if (path.isAbsolute(file.path)) {
            targetUri = vscode.Uri.file(file.path);
        }
        else if (workspaceRootUri) {
            targetUri = vscode.Uri.joinPath(workspaceRootUri, file.path);
        }
        else {
            targetUri = vscode.Uri.file(file.path);
        }
        const fileDiagnostics = [];
        for (const candidate of file.sqlCandidates || []) {
            const lineNum = Math.max(0, (candidate.line || 1) - 1);
            const findings = candidate.validation?.findings || [];
            const status = candidate.validation?.status;
            // Handle unsupported queries as informational diagnostics
            if (status === "unsupported") {
                const diag = new vscode.Diagnostic(new vscode.Range(lineNum, 0, lineNum, 100), `DB Copilot: Query uses unsupported SQL syntax and cannot be automatically verified against schema.`, vscode.DiagnosticSeverity.Information);
                diag.source = "DB Copilot";
                diag.code = "UNSUPPORTED_SQL";
                fileDiagnostics.push(diag);
                continue;
            }
            for (const finding of findings) {
                const { message, code, severity } = formatFindingMessage(finding);
                const diag = new vscode.Diagnostic(new vscode.Range(lineNum, 0, lineNum, 100), `DB Copilot: ${message}`, severity);
                diag.source = "DB Copilot";
                diag.code = `dbcopilot.${code}`;
                fileDiagnostics.push(diag);
            }
        }
        if (fileDiagnostics.length > 0) {
            diagnosticsByFile.set(targetUri.fsPath, fileDiagnostics);
            collection.set(targetUri, fileDiagnostics);
        }
    }
}
//# sourceMappingURL=diagnostics.js.map