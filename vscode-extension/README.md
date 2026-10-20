# DB Copilot — VS Code Extension

**AI-Powered Database Development Assistant for Visual Studio Code**

DB Copilot connects to your live database, discovers queries across your workspace files, performs schema compatibility validation, provides inline diagnostics in your editor and the Problems panel, and offers AI-powered explanations and query fixes.

---

## Features

- **Live Schema Synchronization**: Connects to MySQL databases via the DB Copilot backend.
- **Workspace-wide Query Analysis**: Detects queries across `.js`, `.ts`, and `.sql` files without executing project code.
- **Inline Diagnostics**: Flags nonexistent tables, missing columns, and ambiguous aliases with severity levels directly in the editor and Problems tab.
- **Quick Fixes & AI Explanations**: Generates schema-aware query corrections and explains issues in simple English.
- **Dedicated Activity Bar Views**:
  - **Connection & Status**: Displays live database status, total queries, valid queries, and compatibility issue counts.
  - **Compatibility Findings**: Interactive tree grouping issues by file. Click any finding to reveal the line.
  - **Schema Explorer**: Interactive browser for tables, columns, data types, and primary/foreign keys.
- **Schema Drift Detection**: Analyzes drift between your live database schema and application query expectations.

---

## Extension Settings

This extension contributes the following settings:

* `dbcopilot.serverUrl`: URL of the DB Copilot backend API (default: `http://localhost:5000`).
* `dbcopilot.sessionId`: Active database session ID (populated automatically when connecting).
* `dbcopilot.autoAnalyzeOnSave`: Automatically re-analyzes database-related files when saved (default: `true`).

---

## Commands

- `DB Copilot: Connect Database`: Interactively connects to your MySQL database.
- `DB Copilot: Disconnect Database`: Closes the current session.
- `DB Copilot: Analyze Workspace`: Runs full workspace compatibility analysis.
- `DB Copilot: Analyze Active File`: Re-analyzes the currently open document.
- `DB Copilot: Validate Selected SQL`: Runs fast schema validation on highlighted SQL.
- `DB Copilot: Explain Selected SQL with AI`: Opens AI explanation and suggested fixes in a side view.
- `DB Copilot: Compare Schema Drift`: Compares schema drift against expected definitions.
