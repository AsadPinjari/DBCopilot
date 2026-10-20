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
exports.DBCopilotApiClient = void 0;
const vscode = __importStar(require("vscode"));
function getServerUrl() {
    const config = vscode.workspace.getConfiguration("dbcopilot");
    return config.get("serverUrl", "http://localhost:5000").replace(/\/$/, "");
}
async function request(endpoint, options = {}) {
    const serverUrl = getServerUrl();
    const url = `${serverUrl}${endpoint}`;
    const timeoutMs = options.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        });
        const data = (await response.json());
        if (!response.ok || data.success === false) {
            const msg = typeof data.message === "string"
                ? data.message
                : `Server returned HTTP ${response.status}`;
            throw new Error(msg);
        }
        return data;
    }
    catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            throw new Error(`Request to DB Copilot server timed out (${timeoutMs}ms).`);
        }
        if (err instanceof Error && err.message.includes("fetch failed")) {
            throw new Error(`Could not reach DB Copilot server at ${serverUrl}. Is the backend running?`);
        }
        throw err;
    }
    finally {
        clearTimeout(timeout);
    }
}
class DBCopilotApiClient {
    static async checkHealth() {
        return request("/api/health", {
            timeoutMs: 4000,
        });
    }
    static async getCapabilities() {
        return request("/api/database/capabilities", {
            method: "GET",
        });
    }
    static async connect(credentials) {
        return request("/api/database/connect", {
            method: "POST",
            body: credentials,
            timeoutMs: 12000,
        });
    }
    static async disconnect(sessionId) {
        return request("/api/database/disconnect", {
            method: "POST",
            body: { sessionId },
        });
    }
    static async inspectSchema(sessionId) {
        return request("/api/schema/inspect", {
            method: "POST",
            body: { sessionId },
            timeoutMs: 12000,
        });
    }
    static async getSchemaSnapshot(sessionId) {
        return request("/api/schema/snapshot", {
            method: "POST",
            body: { sessionId },
        });
    }
    static async compareSchemaDrift(sessionId, baseSnapshot, applicationAnalysis) {
        return request("/api/schema/compare", {
            method: "POST",
            body: { sessionId, baseSnapshot, applicationAnalysis },
        });
    }
    static async analyzeFiles(sessionId, files) {
        return request("/api/codebase/analyze-files", {
            method: "POST",
            body: { sessionId, files },
            timeoutMs: 25000,
        });
    }
    static async validateSQL(sessionId, sql) {
        return request("/api/sql/validate", {
            method: "POST",
            body: { sessionId, sql },
        });
    }
    static async explainSQL(sessionId, sql) {
        return request("/api/ai/explain", {
            method: "POST",
            body: { sessionId, sql },
            timeoutMs: 30000,
        });
    }
}
exports.DBCopilotApiClient = DBCopilotApiClient;
//# sourceMappingURL=apiClient.js.map