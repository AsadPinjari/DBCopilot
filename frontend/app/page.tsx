
"use client";

import { useState } from "react";

import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";

import SectionCard from "@/components/ui/SectionCard";
import Feedback from "@/components/ui/Feedback";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import DatabaseConnection from "@/components/database/DatabaseConnection";
import SchemaExplorer from "@/components/database/SchemaExplorer";

import ProjectAnalyzer from "@/components/analysis/ProjectAnalyzer";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";

import SQLExplainer from "@/components/sql/SQLExplainer";

import {
  connectDatabase,
  disconnectDatabase,
  inspectSchema,
  analyzeCodebase,
  explainSQL,
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

export default function Home() {
  // Database connection fields
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("3306");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");

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

  // SQL explanation state
  const [sql, setSQL] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [sqlResult, setSQLResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [sqlError, setSQLError] = useState("");

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

  // Connect to the database
  async function handleConnect() {
    setIsConnecting(true);
    setConnectionError("");
    setConnectionMessage("");

    try {
      const response = await connectDatabase({
        host,
        port: Number(port),
        username,
        password,
        database,
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

  // Disconnect from the database
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

  // Inspect database schema
  async function handleInspectSchema() {
    if (!sessionId || !isConnected) {
      setSchemaError("Connect to a database first.");
      return;
    }

    setIsInspecting(true);
    setSchemaError("");

    try {
      const response = await inspectSchema(sessionId);
      const data = getResponseData(response) as Record<string, unknown>;

      const result =
        data.result && typeof data.result === "object"
          ? (data.result as Record<string, unknown>)
          : data;

      const schema = result.schema ?? result.tables;

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

  // Analyze an uploaded ZIP project
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

  // Explain and validate SQL
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

  // Copy suggested SQL
  async function handleCopySQL(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setSQLError(
        "Could not copy automatically. Please select and copy the SQL manually."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <AppHeader />

        <SectionCard
          title="Database Connection"
          description="Connect DB Copilot to your database to inspect its schema and analyze SQL."
          step={1}
        >
          <DatabaseConnection
            host={host}
            port={port}
            username={username}
            password={password}
            database={database}
            isConnecting={isConnecting}
            isConnected={isConnected}
            onHostChange={setHost}
            onPortChange={setPort}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onDatabaseChange={setDatabase}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />

          <Feedback type="success" message={connectionMessage} />
          <Feedback type="error" message={connectionError} />
        </SectionCard>

        <SectionCard
          title="Schema Explorer"
          description="Inspect tables, columns, keys, and relationships in your connected database."
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

        <SectionCard
          title="Project Code Analysis"
          description="Upload a ZIP of your codebase to find database-related code and SQL validation issues."
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

        <SectionCard
          title="AI SQL Explainer"
          description="Understand a query, review its validation findings, and inspect suggested SQL."
          step={4}
        >
          <SQLExplainer
            sql={sql}
            isExplaining={isExplaining}
            isConnected={isConnected}
            result={sqlResult}
            error={sqlError}
            onSQLChange={(value) => {
              setSQL(value);
              setSQLError("");
            }}
            onExplain={handleExplainSQL}
            onCopy={handleCopySQL}
          />

          {isExplaining && <LoadingSpinner />}
        </SectionCard>

        <AppFooter />
      </div>
    </main>
  );
}
