import * as vscode from "vscode";
import type {
  AnalysisResult,
  SchemaInspection,
  SQLExplainResponse,
  ValidationResult,
} from "./types";

function getServerUrl(): string {
  const config = vscode.workspace.getConfiguration("dbcopilot");
  return config.get<string>("serverUrl", "http://localhost:5000").replace(/\/$/, "");
}

async function request<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    timeoutMs?: number;
  } = {}
): Promise<T> {
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

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok || data.success === false) {
      const msg =
        typeof data.message === "string"
          ? data.message
          : `Server returned HTTP ${response.status}`;
      throw new Error(msg);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to DB Copilot server timed out (${timeoutMs}ms).`);
    }
    if (err instanceof Error && err.message.includes("fetch failed")) {
      throw new Error(
        `Could not reach DB Copilot server at ${serverUrl}. Is the backend running?`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export class DBCopilotApiClient {
  static async checkHealth(): Promise<{ message: string; timestamp: string }> {
    return request<{ message: string; timestamp: string }>("/api/health", {
      timeoutMs: 4000,
    });
  }

  static async getCapabilities(): Promise<{ success: boolean; engines: Record<string, any> }> {
    return request<{ success: boolean; engines: Record<string, any> }>("/api/database/capabilities", {
      method: "GET",
    });
  }

  static async connect(credentials: {
    engine?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    filepath?: string;
    uri?: string;
  }): Promise<{ sessionId: string; message: string }> {
    return request<{ sessionId: string; message: string }>("/api/database/connect", {
      method: "POST",
      body: credentials,
      timeoutMs: 12000,
    });
  }

  static async disconnect(sessionId: string): Promise<{ message: string }> {
    return request<{ message: string }>("/api/database/disconnect", {
      method: "POST",
      body: { sessionId },
    });
  }

  static async inspectSchema(
    sessionId: string
  ): Promise<{ schema: SchemaInspection }> {
    return request<{ schema: SchemaInspection }>("/api/schema/inspect", {
      method: "POST",
      body: { sessionId },
      timeoutMs: 12000,
    });
  }

  static async getSchemaSnapshot(sessionId: string): Promise<{ snapshot: unknown }> {
    return request<{ snapshot: unknown }>("/api/schema/snapshot", {
      method: "POST",
      body: { sessionId },
    });
  }

  static async compareSchemaDrift(
    sessionId: string,
    baseSnapshot: unknown,
    applicationAnalysis?: unknown
  ): Promise<{ report: unknown }> {
    return request<{ report: unknown }>("/api/schema/compare", {
      method: "POST",
      body: { sessionId, baseSnapshot, applicationAnalysis },
    });
  }

  static async analyzeFiles(
    sessionId: string,
    files: { path: string; content: string }[]
  ): Promise<{ result: AnalysisResult }> {
    return request<{ result: AnalysisResult }>("/api/codebase/analyze-files", {
      method: "POST",
      body: { sessionId, files },
      timeoutMs: 25000,
    });
  }

  static async validateSQL(
    sessionId: string,
    sql: string
  ): Promise<{ result: { sql: string; validation: ValidationResult } }> {
    return request<{ result: { sql: string; validation: ValidationResult } }>(
      "/api/sql/validate",
      {
        method: "POST",
        body: { sessionId, sql },
      }
    );
  }

  static async explainSQL(
    sessionId: string,
    sql: string
  ): Promise<{ result: SQLExplainResponse }> {
    return request<{ result: SQLExplainResponse }>("/api/ai/explain", {
      method: "POST",
      body: { sessionId, sql },
      timeoutMs: 30000,
    });
  }
}
