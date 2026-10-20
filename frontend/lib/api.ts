
const API_BASE_URL = "http://localhost:5000";

async function request<T>(
  endpoint: string,
  options: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export type ConnectDatabasePayload = {
  engine?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filepath?: string;
  uri?: string;
};

export function getCapabilities() {
  return request<{ success: boolean; engines: Record<string, Record<string, string>> }>(
    "/api/database/capabilities",
    { method: "GET" }
  );
}

export function connectDatabase(payload: ConnectDatabasePayload) {
  return request<Record<string, unknown>>("/api/database/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function disconnectDatabase(sessionId: string) {
  return request<Record<string, unknown>>("/api/database/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function inspectSchema(sessionId: string) {
  return request<Record<string, unknown>>("/api/schema/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function analyzeCodebase(file: File, sessionId: string) {
  const formData = new FormData();
  formData.append("project", file);
  formData.append("sessionId", sessionId);

  return request<Record<string, unknown>>("/api/codebase/analyze", {
    method: "POST",
    body: formData,
  });
}

/** Validate SQL against live schema without calling the AI service. */
export function validateSQL(sessionId: string, sql: string) {
  return request<Record<string, unknown>>("/api/sql/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, sql }),
  });
}

export function explainSQL(sessionId: string, sql: string) {
  return request<Record<string, unknown>>("/api/ai/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, sql }),
  });
}


export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export type ChatResponse = {
  success: boolean;
  answer: string;
};

export function chatWithCopilot(
  message: string,
  sessionId?: string,
  history: ChatMessage[] = []
) {
  return request<ChatResponse>("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {}),
      history,
    }),
  });
}

/** Download analysis result as a JSON file in the browser. */
export function downloadAnalysisReport(
  analysis: unknown,
  filename = "dbcopilot-report.json"
): void {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type ExtensionInfo = {
  success: boolean;
  available: boolean;
  filename: string;
  name: string;
  displayName: string;
  version: string;
  targetEngine: string;
  sizeBytes: number;
  sizeFormatted: string;
  downloadUrl: string;
  backendUrl: string;
  commands: { id: string; title: string }[];
  settings: { key: string; default: unknown; description: string }[];
};

export function getExtensionInfo() {
  return request<ExtensionInfo>("/api/extension/info", { method: "GET" });
}

export function checkBackendHealth() {
  return request<{ success: boolean; message: string; timestamp: string }>(
    "/api/health",
    { method: "GET" }
  );
}

