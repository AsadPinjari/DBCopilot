"use client";

import React, { useState } from "react";

export type DatabaseConnectionProps = {
  engine: string;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  filepath: string;
  uri: string;
  isConnecting: boolean;
  isConnected: boolean;
  capabilities?: Record<string, Record<string, string>>;
  onEngineChange: (value: string) => void;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDatabaseChange: (value: string) => void;
  onFilepathChange: (value: string) => void;
  onUriChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

const ENGINES = [
  { id: "mysql", name: "MySQL", category: "Relational", defaultPort: "3306" },
  { id: "postgres", name: "PostgreSQL", category: "Relational", defaultPort: "5432" },
  { id: "sqlite", name: "SQLite", category: "Relational", defaultPort: "" },
  { id: "mariadb", name: "MariaDB", category: "Relational", defaultPort: "3306" },
  { id: "mongodb", name: "MongoDB", category: "NoSQL", defaultPort: "27017" },
  { id: "redis", name: "Redis", category: "In-Memory / NoSQL", defaultPort: "6379" },
  { id: "sqlserver", name: "Microsoft SQL Server", category: "Relational (Planned)", defaultPort: "1433" },
  { id: "oracle", name: "Oracle Database", category: "Relational (Planned)", defaultPort: "1521" },
  { id: "cassandra", name: "Apache Cassandra", category: "NoSQL (Planned)", defaultPort: "9042" },
  { id: "neo4j", name: "Neo4j Graph", category: "Graph (Planned)", defaultPort: "7687" },
  { id: "snowflake", name: "Snowflake", category: "Warehouse (Planned)", defaultPort: "443" },
  { id: "redshift", name: "Amazon Redshift", category: "Warehouse (Planned)", defaultPort: "5439" },
  { id: "bigquery", name: "Google BigQuery", category: "Warehouse (Planned)", defaultPort: "443" },
];

export default function DatabaseConnection({
  engine,
  host,
  port,
  username,
  password,
  database,
  filepath,
  uri,
  isConnecting,
  isConnected,
  capabilities,
  onEngineChange,
  onHostChange,
  onPortChange,
  onUsernameChange,
  onPasswordChange,
  onDatabaseChange,
  onFilepathChange,
  onUriChange,
  onConnect,
  onDisconnect,
}: DatabaseConnectionProps) {
  const [useUri, setUseUri] = useState(false);

  const currentCap = capabilities?.[engine] || {};

  function handleEngineSelect(newEngine: string) {
    onEngineChange(newEngine);
    const eng = ENGINES.find((e) => e.id === newEngine);
    if (eng && eng.defaultPort && !isConnected) {
      onPortChange(eng.defaultPort);
    }
  }

  function renderStatusBadge(status?: string) {
    if (status === "Implemented and tested") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {status}
        </span>
      );
    }
    if (status === "Partially supported") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        {status || "Not implemented"}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engine Selection */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-200">
          Database Engine
        </label>
        <select
          value={engine}
          onChange={(e) => handleEngineSelect(e.target.value)}
          disabled={isConnecting || isConnected}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500 disabled:opacity-60"
        >
          {ENGINES.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.name} ({eng.category})
            </option>
          ))}
        </select>
      </div>

      {/* Engine Capability Matrix Preview */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Engine Capability Matrix ({engine.toUpperCase()})
          </span>
          <span className="text-xs text-slate-500">Live Backend Verification</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-5">
          <div className="space-y-1">
            <span className="block text-slate-400">Connection</span>
            {renderStatusBadge(currentCap["Connection & Authentication"])}
          </div>
          <div className="space-y-1">
            <span className="block text-slate-400">Schema Inspect</span>
            {renderStatusBadge(currentCap["Schema Inspection"])}
          </div>
          <div className="space-y-1">
            <span className="block text-slate-400">Query Validation</span>
            {renderStatusBadge(currentCap["Query Validation"])}
          </div>
          <div className="space-y-1">
            <span className="block text-slate-400">Codebase Scan</span>
            {renderStatusBadge(currentCap["Codebase Query Detection"])}
          </div>
          <div className="space-y-1">
            <span className="block text-slate-400">AI Explanations</span>
            {renderStatusBadge(currentCap["AI Explanations & Suggestions"])}
          </div>
        </div>
      </div>

      {/* Engine-Specific Connection Fields */}
      {engine === "sqlite" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              SQLite Database File Path
            </label>
            <input
              value={filepath}
              onChange={(e) => onFilepathChange(e.target.value)}
              placeholder="e.g. ./dev.db or :memory:"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use &apos;:memory:&apos; for transient in-memory database testing, or provide an absolute or relative path to a .sqlite / .db file.
            </p>
          </div>
        </div>
      ) : engine === "mongodb" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseUri(!useUri)}
              className="text-xs text-blue-400 underline hover:text-blue-300"
            >
              {useUri ? "Switch to Host/Port Form" : "Switch to Connection URI"}
            </button>
          </div>

          {useUri ? (
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                MongoDB Connection URI
              </label>
              <input
                value={uri}
                onChange={(e) => onUriChange(e.target.value)}
                placeholder="mongodb://localhost:27017/dbcopilot_mongo_demo"
                disabled={isConnecting || isConnected}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-slate-400">
                Tip: Specify a database name in the URI or leave blank to auto-discover all user databases.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Host</label>
                <input
                  value={host}
                  onChange={(e) => onHostChange(e.target.value)}
                  placeholder="localhost"
                  disabled={isConnecting || isConnected}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => onPortChange(e.target.value)}
                  placeholder="27017"
                  disabled={isConnecting || isConnected}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Database Name (Optional)</label>
                <input
                  value={database}
                  onChange={(e) => onDatabaseChange(e.target.value)}
                  placeholder="e.g. dbcopilot_mongo_demo (blank to auto-detect)"
                  disabled={isConnecting || isConnected}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Username (Optional)</label>
                <input
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  placeholder="admin"
                  disabled={isConnecting || isConnected}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-300">Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="password"
                  disabled={isConnecting || isConnected}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>
      ) : engine === "redis" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Redis Host</label>
            <input
              value={host}
              onChange={(e) => onHostChange(e.target.value)}
              placeholder="127.0.0.1"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => onPortChange(e.target.value)}
              placeholder="6379"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Redis AUTH password"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>
        </div>
      ) : (
        /* Standard SQL engines (MySQL, PostgreSQL, MariaDB, SQL Server, etc.) */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Host</label>
            <input
              value={host}
              onChange={(e) => onHostChange(e.target.value)}
              placeholder="localhost"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => onPortChange(e.target.value)}
              placeholder={engine === "postgres" ? "5432" : "3306"}
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Username</label>
            <input
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Database username"
              autoComplete="username"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Database password"
              autoComplete="current-password"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">Database Name</label>
            <input
              value={database}
              onChange={(e) => onDatabaseChange(e.target.value)}
              placeholder="Database name"
              disabled={isConnecting || isConnected}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {!isConnected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConnecting ? "Connecting..." : `Connect ${engine.toUpperCase()}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 font-medium text-red-300 transition hover:bg-red-500/20"
          >
            Disconnect Database
          </button>
        )}
      </div>

      {isConnected && (
        <p className="text-sm text-emerald-400">
          Connected to {engine.toUpperCase()} successfully. Session active.
        </p>
      )}
    </div>
  );
}
