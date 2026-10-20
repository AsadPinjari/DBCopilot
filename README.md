# DB Copilot — AI-Powered Database Development Assistant

> **Understand your database. Validate your code. Detect compatibility issues. Fix problems with confidence.**

DB Copilot bridges the gap between application source code and live database schemas. It discovers queries inside your codebase, validates SQL statements against actual live database definitions, detects schema drift, generates AI-powered explanations and corrections, and provides seamless developer tools through both a **modern Web Application** and a **native Visual Studio Code extension**.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          Google Gemini API           │
                      │  (gemini-2.5-flash AI Explanations)  │
                      └──────────────────▲───────────────────┘
                                         │
┌─────────────────────────┐   HTTP/REST  │   ┌───────────────────────────┐
│     Web Application     │──────────────┼──▶│    Express Backend API    │
│ (Next.js 16 + Tailwind) │              │   │   (Port 5000, Node.js)    │
└─────────────────────────┘              │   └─────────────┬─────────────┘
                                         │                 │
┌─────────────────────────┐   HTTP/REST  │                 │ mysql2
│    VS Code Extension    │──────────────┘                 ▼
│ (Diagnostics & Actions) │                     ┌─────────────────────┐
└─────────────────────────┘                     │    MySQL Database   │
                                                │   (Live Introspect) │
                                                └─────────────────────┘
```

- **Backend**: Express (Node.js), multi-engine adapter architecture (`mysql2`, `pg`, `node:sqlite`, `mongodb`, `ioredis`), `node-sql-parser` AST validator, and `adm-zip` static archive scanner.
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, dark-mode developer UI with dynamic engine selector and capability badges.
- **IDE Extension**: VS Code Extension with native Diagnostic API, Quick Fix CodeAction providers, live capability matrix viewer, and dedicated Activity Bar tree views.
- **AI Engine**: Google Gemini API via `@google/genai` (`gemini-2.5-flash`) with automated secret/credential redaction.
- **Security**: Cryptographic 256-bit session tokens, dual idle (30m) & absolute (4h) timeouts, payload size limits, rate limiting, and archive zip-bomb guards (see `SECURITY.md`).

---

## Supported Database Engines & Capability Matrix

DB Copilot features an extensible adapter architecture with honest, granular capability reporting:

| Database Engine | Category | Connection & Auth | Schema Inspection | Query Validation | Codebase Detection | Status |
|---|---|---|---|---|---|---|
| **MySQL** | Relational SQL | Implemented and tested | Implemented and tested | Implemented and tested | Implemented and tested | Implemented and tested |
| **PostgreSQL** | Relational SQL | Implemented and tested | Implemented and tested | Implemented and tested ($1 normalized) | Implemented and tested | Implemented and tested |
| **SQLite** | Relational (Native) | Implemented and tested | Implemented and tested | Implemented and tested | Implemented and tested | Implemented and tested |
| **MariaDB** | Relational SQL | Implemented and tested | Implemented and tested | Implemented and tested | Implemented and tested | Implemented and tested |
| **MongoDB** | NoSQL Document | Implemented and tested | Implemented and tested | Aggregation & Collections tested | Partially supported | Partially supported |
| **Redis** | In-Memory / NoSQL | Implemented and tested | Keyspace inspected | Safe vs Blocking Command Analysis | Partially supported | Partially supported |
| **Microsoft SQL Server**| Relational (Planned) | Stubbed | Stubbed | Stubbed | Not implemented | Planned |
| **Oracle Database** | Relational (Planned) | Stubbed | Stubbed | Stubbed | Not implemented | Planned |
| **Apache Cassandra** | NoSQL (Planned) | Stubbed | Stubbed | Stubbed | Not implemented | Planned |
| **Neo4j Graph** | Graph (Planned) | Stubbed | Stubbed | Stubbed | Not implemented | Planned |
| **Snowflake / Redshift / BigQuery** | Cloud Warehouses | Extension path | Extension path | Extension path | Extension path | Planned |

---

## Repository Structure

```
DBCopilot/
├── backend/                  # Express REST API server
│   ├── src/
│   │   ├── adapters/         # Extensible database adapters (MySQL, Postgres, SQLite, Mongo, Redis, Stubs)
│   │   ├── middleware/       # Security headers, rate limiting, and payload guards
│   │   ├── routes/           # database, schema, codebase, ai, sql routes
│   │   ├── services/         # session, database, schema, codebase, drift, ai services
│   │   └── server.js         # Entry point (port 5000)
│   ├── tests/                # 49 automated tests (adapters, session security, AST, drift, e2e)
│   └── .env.example          # Environment variables template
├── frontend/                 # Next.js 16 Web Application
│   ├── app/                  # App router pages & layouts
│   ├── components/           # UI, database connection with engine selector, analysis, sql, drift
│   └── lib/api.ts            # Typed client for backend API
├── vscode-extension/         # Visual Studio Code Extension
│   ├── src/                  # extension.ts, apiClient.ts, diagnostics.ts, treeViews.ts
│   ├── out/                  # Compiled JavaScript
│   ├── build-vsix.js         # Script to package VSIX
│   └── dbcopilot-1.0.0.vsix  # Pre-built packaged extension
├── sample-project/           # Real-world fixture for acceptance testing
│   ├── src/                  # Valid, missing reference, and unsupported queries
│   └── migrations/           # 001 initial schema and 002 drift migration
├── sample-project.zip        # Packaged fixture for web upload demo
├── SECURITY.md               # Security architecture, session lifecycle, and policy
├── DEMO.md                   # Step-by-step verification script for Scenarios A through H
└── database/
    └── seed.sql              # MySQL initialization script
```

---

## Quickstart & Installation

### 1. Database Setup (MySQL)

Create and populate the test database using MySQL CLI or your favorite database GUI:

```bash
mysql -u root -p < database/seed.sql
```

*(For SQLite, you can test immediately with zero external services using `:memory:` or a local file).*

### 2. Backend Setup (Port 5000)

```bash
cd backend
npm install
cp .env.example .env   # On Windows: copy .env.example .env
```

Edit `backend/.env` with your credentials and AI provider key (Groq, Gemini, or OpenAI/Ollama):

```ini
PORT=5000
FRONTEND_ORIGIN=http://localhost:3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ordermng

# Fast free AI provider (~1.7s latency, 14,400 free requests/day):
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Or Google Gemini (auto-fallbacks across stable flash-lite endpoints):
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

Start the backend:

```bash
npm run dev
# Server runs at http://localhost:5000
```

### 3. Frontend Setup (Port 3001)

In a new terminal:

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3001 in your browser
```

### 4. VS Code Extension Installation

You can install the pre-built VSIX file directly into VS Code:

```bash
code --install-extension vscode-extension/dbcopilot-1.0.0.vsix
```

Or download it directly from the Web Application at `http://localhost:3001/ide` (or via `GET /api/extension/download`).

Alternatively, open `vscode-extension/` in VS Code and press **F5** to run the Extension Development Host.

---

## Running the Automated Test Suites

### Backend Unit & Integration Tests (56 tests)
```bash
cd backend
npm test
```
*Covers database adapters (MySQL, Postgres, SQLite, Mongo, Redis), cryptographic session token security, authorization, AST query validation, hierarchical subquery scoping, schema drift, and end-to-end scenarios.*

### Extension Tests & Compilation (3 tests)
```bash
cd vscode-extension
npm run compile
npm test
```

### Frontend Typecheck & Production Build
```bash
cd frontend
npm run lint
npm run build
```

---

## Features Walkthrough

1. **Multi-Database Support & Live Capability Matrix**:
   - Dynamic engine selector (MySQL, PostgreSQL, SQLite, MariaDB, MongoDB, Redis).
   - Real-time capability status badges fetched from live backend contracts.
2. **Schema Introspection & Filter**:
   - Live column, data type, primary key, and foreign key inspection.
   - Real-time search/filter across tables and columns with "Expand all" / "Collapse all".
3. **Code ↔ Database Compatibility Analysis**:
   - Upload application archives (`.zip`) or scan workspace files.
   - Discovers queries and validates column/table names against live schema.
   - Human-readable cards with severity badges (Error, Warning, Info).
   - Export analysis report as JSON.
4. **Interactive Schema Drift**:
   - Compare code expectations against live database definitions.
   - Pinpoints dropped/altered tables and columns.
   - Migration impact detector scans SQL migrations for destructive operations (`DROP TABLE`, `DROP COLUMN`).
5. **SQL Assistant & AI**:
   - Non-AI schema validation for instant feedback without API token cost.
   - Dialect-aware parameter normalization (`$1`, `?`, `:param`).
   - Gemini-powered query explanations and schema-aware correction suggestions with automated secret redaction.
6. **VS Code Extension Integration**:
   - Native diagnostics in editor gutter and Problems panel.
   - Quick Fix code actions: "Explain this issue with AI" and "Apply suggested fix".
   - Tree view sidebar for connection status, findings list, and schema hierarchy.
   - Engine selector and live capabilities explorer command (`DB Copilot: Show Engine Capabilities`).
