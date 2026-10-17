
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
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

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

export function explainSQL(sessionId: string, sql: string) {
  return request<Record<string, unknown>>("/api/ai/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, sql }),
  });
}
