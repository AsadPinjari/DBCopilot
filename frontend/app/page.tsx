
"use client";

import { useEffect, useRef, useState } from "react";

import WorkspaceSidebar, {
  type WorkspaceView,
} from "@/components/layout/WorkspaceSidebar";

import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import SectionCard from "@/components/ui/SectionCard";
import Feedback from "@/components/ui/Feedback";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import DatabaseConnection from "@/components/database/DatabaseConnection";
import SchemaExplorer from "@/components/database/SchemaExplorer";
import ProjectAnalyzer from "@/components/analysis/ProjectAnalyzer";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";
import SchemaDrift from "@/components/analysis/SchemaDrift";
import SQLExplainer from "@/components/sql/SQLExplainer";
import IDEIntegration from "@/components/ide/IDEIntegration";

import {
  connectDatabase,
  disconnectDatabase,
  inspectSchema,
  analyzeCodebase,
  validateSQL,
  explainSQL,
  chatWithCopilot,
  getCapabilities,
  type ChatMessage,
} from "@/lib/api";

import type { SchemaTable } from "@/types";

type ApiResponse = Record<string, unknown>;

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const response = data as Record<string, unknown>;

    if (typeof response.message === "string") return response.message;
    if (typeof response.error === "string") return response.error;
  }

  return fallback;
}

function getResponseData(data: ApiResponse): unknown {
  if (data.success === false) {
    throw new Error(getErrorMessage(data, "The request failed."));
  }

  return data;
}

const suggestions = [
  "Explain primary and foreign keys",
  "How do SQL joins work?",
  "Help me debug a SQL query",
  "How should I design my database schema?",
];

export default function Home({ initialView }: { initialView?: WorkspaceView } = {}) {
  const [activeView, setActiveView] = useState<WorkspaceView>(initialView || "chat");

  // Sync with URL hash or query params on direct navigation and browser back/forward
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || params.get("view");
      const candidate = (tab || hash) as WorkspaceView;
      const validViews: WorkspaceView[] = [
        "chat",
        "schema",
        "sql",
        "code",
        "drift",
        "ide",
        "connections",
      ];
      if (candidate && validViews.includes(candidate)) {
        setActiveView(candidate);
      }
    }
  }, []);

  const handleViewChange = (view: WorkspaceView) => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      const path = view === "chat" ? "/" : view === "ide" ? "/ide" : `#${view}`;
      window.history.replaceState(null, "", path);
    }
  };

  // Database connection fields
  const [engine, setEngine] = useState("mysql");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("3306");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [filepath, setFilepath] = useState("");
  const [uri, setUri] = useState("");
  const [capabilities, setCapabilities] = useState<Record<string, Record<string, string>>>({});

  // Connection state
  const [sessionId, setSessionId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");

  // Schema state
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [schemaError, setSchemaError] = useState("");

  // Project analysis state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [analysisError, setAnalysisError] = useState("");

  // SQL analysis state
  const [sql, setSQL] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [isValidatingOnly, setIsValidatingOnly] = useState(false);
  const [sqlResult, setSQLResult] =
    useState<Record<string, unknown> | null>(null);
  const [sqlError, setSQLError] = useState("");

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Automatically scroll to the newest message.
  useEffect(() => {
    const container = chatScrollRef.current;

    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatMessages, isChatLoading]);

  // Load capabilities matrix on mount
  useEffect(() => {
    getCapabilities()
      .then((res) => {
        if (res && res.engines) {
          setCapabilities(res.engines);
        }
      })
      .catch(() => {});
  }, []);

  function clearResults() {
    setTables([]);
    setSchemaError("");

    setSelectedFile(null);
    setAnalysis(null);
    setAnalysisError("");

    setSQL("");
    setSQLResult(null);
    setSQLError("");
  }

  // Open the existing database credentials page.
  function openDatabaseConnection() {
    handleViewChange("connections");
  }

  // Connect to the database.
  async function handleConnect() {
    setIsConnecting(true);
    setConnectionError("");
    setConnectionMessage("");

    try {
      const response = await connectDatabase({
        engine,
        host,
        port: port ? Number(port) : undefined,
        username,
        password,
        database,
        filepath: engine === "sqlite" ? filepath : undefined,
        uri: engine === "mongodb" && uri ? uri : undefined,
      });

      const data = getResponseData(response);

      if (!data || typeof data !== "object") {
        throw new Error("Invalid response from the backend.");
      }

      const result = data as Record<string, unknown>;

      if (typeof result.sessionId !== "string" || !result.sessionId) {
        throw new Error(
          getErrorMessage(data, "The backend did not return a session ID.")
        );
      }

      clearResults();

      setSessionId(result.sessionId);
      setIsConnected(true);

      setConnectionMessage(
        typeof result.message === "string"
          ? result.message
          : "Database connected successfully."
      );
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Failed to connect to the database."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  // Disconnect from the database.
  async function handleDisconnect() {
    if (!sessionId) return;

    setIsConnecting(true);
    setConnectionError("");

    try {
      const response = await disconnectDatabase(sessionId);
      getResponseData(response);

      setSessionId("");
      setIsConnected(false);
      setConnectionMessage("Database disconnected successfully.");

      clearResults();
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Failed to disconnect from the database."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  // Inspect the connected database schema.
  async function handleInspectSchema() {
    if (!sessionId || !isConnected) {
      setSchemaError("Connect to a database first.");
      return;
    }

    setIsInspecting(true);
    setSchemaError("");

    try {
      const response = await inspectSchema(sessionId);

      // Backend returns: { success: true, schema: { database, engine, tables: [...] } }
      const schema = response.schema as
        | { tables?: unknown[] }
        | undefined;

      let tableList: unknown[] = [];

      if (Array.isArray(schema)) {
        tableList = schema;
      } else if (schema && typeof schema === "object") {
        const schemaObject = schema as Record<string, unknown>;
        if (Array.isArray(schemaObject.tables)) {
          tableList = schemaObject.tables;
        }
      }

      setTables(tableList as SchemaTable[]);
    } catch (error) {
      setSchemaError(
        error instanceof Error
          ? error.message
          : "Failed to inspect the database schema."
      );
    } finally {
      setIsInspecting(false);
    }
  }

  // Analyze an uploaded project ZIP.
  async function handleAnalyzeProject() {
    if (!sessionId || !isConnected) {
      setAnalysisError("Connect to a database before analyzing your project.");
      return;
    }

    if (!selectedFile) {
      setAnalysisError("Please select a project ZIP file.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      setAnalysisError("Please upload a ZIP file.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    setAnalysis(null);

    try {
      const response = await analyzeCodebase(selectedFile, sessionId);
      const data = getResponseData(response) as Record<string, unknown>;

      setAnalysis(data.result ?? data);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Failed to analyze the project."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Explain and validate SQL.
  async function handleExplainSQL() {
    if (!sessionId || !isConnected) {
      setSQLError("Connect to a database before analyzing SQL.");
      return;
    }

    if (!sql.trim()) {
      setSQLError("Enter an SQL query first.");
      return;
    }

    setIsExplaining(true);
    setSQLError("");
    setSQLResult(null);

    try {
      const response = await explainSQL(sessionId, sql);
      const data = getResponseData(response) as Record<string, unknown>;
      const result = data.result ?? data;

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The backend returned an invalid SQL analysis result.");
      }

      setSQLResult(result as Record<string, unknown>);
    } catch (error) {
      setSQLError(
        error instanceof Error
          ? error.message
          : "Failed to explain the SQL query."
      );
    } finally {
      setIsExplaining(false);
    }
  }

  // Fast validate SQL against live schema without AI
  async function handleValidateSQLOnly() {
    if (!sessionId || !isConnected) {
      setSQLError("Connect to a database before analyzing SQL.");
      return;
    }

    if (!sql.trim()) {
      setSQLError("Enter an SQL query first.");
      return;
    }

    setIsValidatingOnly(true);
    setSQLError("");
    setSQLResult(null);

    try {
      const response = await validateSQL(sessionId, sql);
      const data = getResponseData(response) as Record<string, unknown>;
      const result = (data.result ?? data) as Record<string, unknown>;

      setSQLResult({
        originalSql: sql,
        validation: result.validation as Record<string, unknown>,
      });
    } catch (error) {
      setSQLError(
        error instanceof Error
          ? error.message
          : "Failed to validate SQL query."
      );
    } finally {
      setIsValidatingOnly(false);
    }
  }

  // Copy suggested SQL.
  async function handleCopySQL(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setSQLError(
        "Could not copy automatically. Please select and copy the SQL manually."
      );
    }
  }

  // Send a message to DB Copilot.
  async function handleSendChat() {
    const message = chatInput.trim();

    if (!message || isChatLoading) return;

    const previousMessages = chatMessages.slice(-10);

    const updatedMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", text: message },
    ];

    setChatMessages(updatedMessages);
    setChatInput("");
    setChatError("");
    setIsChatLoading(true);

    try {
      const response = await chatWithCopilot(
        message,
        isConnected ? sessionId : undefined,
        previousMessages
      );

      if (!response || typeof response.answer !== "string") {
        throw new Error("The AI returned an invalid response.");
      }

      setChatMessages([
        ...updatedMessages,
        { role: "model", text: response.answer },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Failed to get an AI response."
      );
    } finally {
      setIsChatLoading(false);

      // Return the cursor to the composer after the response.
      window.requestAnimationFrame(() => {
        chatInputRef.current?.focus();
      });
    }
  }

  function handleNewChat() {
    if (isChatLoading) return;

    setChatMessages([]);
    setChatInput("");
    setChatError("");

    window.requestAnimationFrame(() => {
      chatInputRef.current?.focus();
    });
  }

  return (
    <main
      className={`bg-[#080b14] text-slate-100 ${
        activeView === "chat" ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1800px] ${
          activeView === "chat" ? "h-screen" : "min-h-screen"
        }`}
      >
        {/* Workspace sidebar */}
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-0 h-screen">
            <WorkspaceSidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              isConnected={isConnected}
            />
          </div>
        </aside>

        {/* Main workspace */}
        <div
          className={`min-w-0 flex-1 px-4 md:px-8 ${
            activeView === "chat"
              ? "flex h-full flex-col overflow-hidden py-3"
              : "py-6 md:py-8"
          }`}
        >
          <div
            className={`mx-auto w-full max-w-5xl ${
              activeView === "chat"
                ? "flex min-h-0 flex-1 flex-col gap-3"
                : "space-y-6"
            }`}
          >
            <AppHeader />

            {/* Database connection credentials page */}
            {activeView === "connections" && (
              <SectionCard
                title="Database Connection"
                description="Connect DB Copilot to inspect your schema and analyze SQL."
                step={1}
              >
                <DatabaseConnection
                  engine={engine}
                  host={host}
                  port={port}
                  username={username}
                  password={password}
                  database={database}
                  filepath={filepath}
                  uri={uri}
                  capabilities={capabilities}
                  isConnecting={isConnecting}
                  isConnected={isConnected}
                  onEngineChange={setEngine}
                  onHostChange={setHost}
                  onPortChange={setPort}
                  onUsernameChange={setUsername}
                  onPasswordChange={setPassword}
                  onDatabaseChange={setDatabase}
                  onFilepathChange={setFilepath}
                  onUriChange={setUri}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />

                <Feedback type="success" message={connectionMessage} />
                <Feedback type="error" message={connectionError} />
              </SectionCard>
            )}

            {/* Schema Explorer */}
            {activeView === "schema" && (
              <SectionCard
                title="Schema Explorer"
                description="Inspect tables, columns, keys, and relationships."
                step={2}
              >
                <SchemaExplorer
                  tables={tables}
                  isInspecting={isInspecting}
                  isConnected={isConnected}
                  error={schemaError}
                  onInspect={handleInspectSchema}
                />
              </SectionCard>
            )}

            {/* Project Code Analysis */}
            {activeView === "code" && (
              <SectionCard
                title="Project Code Analysis"
                description="Upload a ZIP to inspect database-related code and SQL issues."
                step={3}
              >
                <ProjectAnalyzer
                  selectedFile={selectedFile}
                  isAnalyzing={isAnalyzing}
                  isConnected={isConnected}
                  onFileChange={(file) => {
                    setSelectedFile(file);
                    setAnalysisError("");
                  }}
                  onAnalyze={handleAnalyzeProject}
                />

                <Feedback type="error" message={analysisError} />

                {isAnalyzing && <LoadingSpinner />}

                {analysis !== null && (
                  <div className="mt-6">
                    <AnalysisDashboard analysis={analysis} />
                  </div>
                )}
              </SectionCard>
            )}

            {/* SQL Assistant */}
            {activeView === "sql" && (
              <SectionCard
                title="SQL Assistant"
                description="Understand queries, review validation findings, and inspect suggested SQL."
                step={4}
              >
                <SQLExplainer
                  sql={sql}
                  isExplaining={isExplaining}
                  isValidatingOnly={isValidatingOnly}
                  isConnected={isConnected}
                  result={sqlResult}
                  error={sqlError}
                  onSQLChange={(value) => {
                    setSQL(value);
                    setSQLError("");
                  }}
                  onExplain={handleExplainSQL}
                  onValidateOnly={handleValidateSQLOnly}
                  onCopy={handleCopySQL}
                />

                {(isExplaining || isValidatingOnly) && <LoadingSpinner />}
              </SectionCard>
            )}

            {/* AI Chat */}
            {activeView === "chat" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <SectionCard
                  title="AI Database Copilot"
                  description="Ask questions, debug SQL, and explore your database."
                  className="chat-card"
                >
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1020]">
                    {/* Compact chat header */}
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-lg text-indigo-300">
                          ✳
                        </div>

                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-white">
                            Ask DB Copilot
                          </h2>
                          <p className="truncate text-[11px] text-slate-400">
                            {isConnected
                              ? "Database context enabled"
                              : "General chat · Connect for schema context"}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`hidden items-center gap-1.5 text-xs sm:flex ${
                            isConnected
                              ? "text-emerald-300"
                              : "text-slate-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isConnected ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          {isConnected ? "Connected" : "Not connected"}
                        </span>

                        <button
                          type="button"
                          onClick={handleNewChat}
                          disabled={isChatLoading}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                        >
                          New chat
                        </button>
                      </div>
                    </div>

                    {/* Scrollable conversation */}
                    <div
                      ref={chatScrollRef}
                      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3 sm:p-4"
                      aria-live="polite"
                    >
                      {chatMessages.length === 0 && (
                        <div className="m-auto w-full max-w-xl shrink-0 py-2 text-center">
                          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-xl text-indigo-300">
                            ✳
                          </div>

                          <h3 className="text-base font-semibold text-white">
                            What can I help you build?
                          </h3>

                          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                            Ask in plain English about SQL, database design,
                            or your schema.
                          </p>

                          {/* Suggested prompts only */}
                          <div className="mx-auto mt-3 grid w-full max-w-lg grid-cols-2 gap-2">
                            {suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setChatInput(suggestion);

                                  window.requestAnimationFrame(() => {
                                    chatInputRef.current?.focus();
                                  });
                                }}
                                className="min-h-10 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-left text-xs leading-4 text-slate-300 transition hover:border-indigo-400/40 hover:bg-indigo-400/5"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {chatMessages.map((message, index) => (
                        <div
                          key={`${index}-${message.role}`}
                          className={`flex shrink-0 gap-2 ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {message.role === "model" && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm text-indigo-300">
                              ✳
                            </div>
                          )}

                          <div
                            className={`max-w-[88%] rounded-xl px-3 py-2.5 sm:max-w-[80%] ${
                              message.role === "user"
                                ? "bg-indigo-600 text-white"
                                : "border border-white/10 bg-white/[0.04] text-slate-200"
                            }`}
                          >
                            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-60">
                              {message.role === "user" ? "You" : "DB Copilot"}
                            </p>

                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.text}
                            </p>

                            {message.role === "model" && (
                              <button
                                type="button"
                                onClick={() => {
                                  void navigator.clipboard
                                    .writeText(message.text)
                                    .catch(() =>
                                      setChatError(
                                        "Could not copy the response automatically."
                                      )
                                    );
                                }}
                                className="mt-2 text-xs text-slate-400 hover:text-white"
                              >
                                Copy response
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {isChatLoading && (
                        <div className="flex shrink-0 items-start gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm text-indigo-300">
                            ✳
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <p className="text-xs text-slate-400">
                              DB Copilot is thinking...
                            </p>
                            <LoadingSpinner />
                          </div>
                        </div>
                      )}

                      {chatError && (
                        <div
                          role="alert"
                          className="shrink-0 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300"
                        >
                          {chatError}
                          <button
                            type="button"
                            onClick={() => setChatError("")}
                            className="ml-2 underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fixed composer */}
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSendChat();
                      }}
                      className="shrink-0 border-t border-white/10 bg-black/10 p-2.5 sm:p-3"
                    >
                      <label htmlFor="copilot-message" className="sr-only">
                        Your message
                      </label>

                      <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#080b14] p-1.5 focus-within:border-indigo-400/50">
                        <textarea
                          ref={chatInputRef}
                          id="copilot-message"
                          value={chatInput}
                          onChange={(event) => setChatInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              void handleSendChat();
                            }
                          }}
                          placeholder="Ask about SQL, schemas, or database design..."
                          rows={1}
                          maxLength={5000}
                          className="max-h-24 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-5 text-white outline-none placeholder:text-slate-500"
                        />

                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isChatLoading}
                          className="mb-0.5 rounded-lg bg-indigo-500 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isChatLoading ? "..." : "Send"}
                        </button>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[10px] text-slate-500">
                        <span>
                          Enter to send · Shift + Enter for a new line
                        </span>
                        <span>{chatInput.length}/5000</span>
                      </div>
                    </form>
                  </div>
                </SectionCard>

                {/* Separate connection section BELOW the chat box */}
                
                  <section className="mt-3 shrink-0 rounded-xl border border-indigo-400/20 bg-[#0d1426] p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="21"
                            height="21"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <ellipse cx="12" cy="5" rx="8" ry="3" />
                            <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
                            <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white">
                            {isConnected
                              ? "Your database is connected"
                              : "Connect to a Live Database"}
                          </h3>

                          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
                            {isConnected
                              ? "Manage your database connection or inspect your live schema."
                              : "Connect your database to let DB Copilot use your actual tables and columns when helping with SQL and schema questions."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openDatabaseConnection}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                      >
                        {isConnected ? "Manage Connection" : "Connect Database"}
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </section>
                

                <p className="shrink-0 pt-1.5 text-[10px] leading-4 text-slate-500">
                  AI responses may be inaccurate. Review SQL before using it.
                  Chat does not execute SQL against your database.
                </p>
              </div>
            )}

            {/* Schema Drift Analyzer */}
            {activeView === "drift" && (
              <SectionCard
                title="Schema Drift"
                description="Detect discrepancies between queries extracted from code and your live database schema."
              >
                <SchemaDrift
                  isConnected={isConnected}
                  tables={tables}
                  analysis={analysis}
                  onNavigate={(view) => handleViewChange(view)}
                />
              </SectionCard>
            )}

            {/* IDE Integration */}
            {activeView === "ide" && (
              <IDEIntegration
                sessionId={sessionId}
                isConnected={isConnected}
                databaseName={database}
              />
            )}

            {activeView !== "chat" && <AppFooter />}
          </div>
        </div>
      </div>
    </main>
  );
}
