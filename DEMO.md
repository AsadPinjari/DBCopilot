# DB Copilot — End-to-End Demonstration Script

This document details the exact, reproducible steps to verify all required scenarios (**Scenario A through Scenario F**) across both the Web Application and the VS Code Extension.

---

## Prerequisites
1. MySQL server running locally on port 3306.
2. Seed database created: `mysql -u root -p < database/seed.sql` (creates database `ordermng` with tables `departments`, `students`, `courses`, `orders`).
3. Backend running on port 5000: `cd backend && npm run dev`
4. Frontend running on port 3001: `cd frontend && npm run dev`
5. VS Code extension loaded or installed via `vscode-extension/dbcopilot-1.0.0.vsix`.

---

## Scenario A: Valid SQL Query Verification

### Web Application
1. Open `http://localhost:3001` in your browser.
2. In the sidebar, select **Connections**.
3. Enter database credentials (`host: localhost`, `port: 3306`, `user: root`, `database: ordermng`) and click **Connect Database**.
4. Navigate to **SQL Assistant**.
5. Click the quick sample chip **Simple SELECT**:
   ```sql
   SELECT * FROM orders WHERE id = 1;
   ```
6. Click **Validate Schema Only**.
   - **Expected Result**: Validation status displays `Valid`, with green badge: `Query passed live schema validation. All referenced tables and columns exist.`

### VS Code Extension
1. Open `sample-project/` in VS Code.
2. Open `src/valid-queries.js`.
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) and run **DB Copilot: Analyze Workspace**.
4. **Expected Result**: No error squigglies are placed in `src/valid-queries.js`. The status notification reports all valid queries.

---

## Scenario B: Missing Table or Column Detection & AI Fix

### Web Application
1. In the web app, navigate to **Code ↔ Database**.
2. Click **Upload Project Archive** and select `sample-project.zip`.
3. Click **Analyze Project**.
4. **Expected Result**:
   - Total queries validated: 7 queries.
   - Compatibility issues card highlights errors in `src/missing-references.js`:
     - Line 7: `Column "gpa" was not found in any table in the query` (in table `students`).
     - Line 12: `Table "teachers" was not found in the database schema`.
     - Line 17: `Table alias "x" is not defined in this query`.
5. Click **Download Analysis Report** to verify JSON export.

### VS Code Extension (Diagnostics & Quick Fix)
1. In VS Code, open `sample-project/src/missing-references.js`.
2. Look at lines 7 and 12:
   - Notice the red underline squigglies placed directly on the defective SQL queries!
   - Open the **Problems** panel (`Ctrl+Shift+M`): see diagnostics grouped under `DB Copilot`:
     - `DB Copilot: Column "gpa" does not exist in table "students".`
     - `DB Copilot: Table "teachers" does not exist in the connected database schema.`
3. Place cursor on line 7 (`SELECT id, name, gpa FROM students WHERE id = 1;`).
4. Click the yellow Quick Fix lightbulb (or press `Ctrl+.`):
   - Select **DB Copilot: Explain this database issue with AI**.
   - An explanation panel opens beside the editor explaining that `gpa` is not in table `students`, showing valid columns (`id`, `name`, `email`, `department_id`).
5. Select **DB Copilot: Generate and review fix with AI**:
   - The extension proposes a corrected query (e.g. `SELECT id, name, email FROM students WHERE id = 1;`).
   - Click **Apply Fix**. The source line is updated safely, and the diagnostic automatically clears!

---

## Scenario C: Unsupported Query Handling

1. In the Web App, navigate to **SQL Assistant**.
2. Enter a query containing constructs outside standard SELECT:
   ```sql
   SELECT id FROM students UNION SELECT id FROM courses;
   ```
3. Click **Validate Schema Only**.
4. **Expected Result**:
   - Validation badge reports: `Unsupported SQL`.
   - Message: `Queries using CTEs or UNION are not supported yet.`
   - Notice: The query is **not** falsely marked as Valid or Invalid!

---

## Scenario D: Backend Disconnection & Resilience

1. In the backend terminal, press `Ctrl+C` to stop the backend process.
2. In VS Code, run **DB Copilot: Analyze Workspace**.
3. **Expected Result**:
   - A clear error message notification appears:
     `Could not reach DB Copilot server at http://localhost:5000. Is the backend running?`
   - VS Code does **not** freeze, crash, or corrupt any workspace files.
4. Restart the backend: `cd backend && npm run dev`.
5. Re-run **DB Copilot: Analyze Workspace** — analysis immediately recovers and succeeds.

---

## Scenario E: Schema Drift & Migration Impact

### Web Application
1. In the web app sidebar, select **Schema Drift**.
2. Observe the 3-step synchronization checklist:
   - Database: Connected
   - Schema: Inspected
   - Codebase: Analyzed
3. Inspect the Drift Report:
   - Identifies any tables in the database that are never referenced in the codebase (coverage).
   - Identifies tables referenced in code that are missing from live schema.

### Migration Impact Detection
1. Open `sample-project/migrations/002_drop_legacy_column.sql`:
   ```sql
   ALTER TABLE students DROP COLUMN legacy_phone;
   DROP TABLE old_audit_logs;
   ```
2. The drift service identifies `DROP_COLUMN: legacy_phone` and `DROP_TABLE: old_audit_logs` as breaking changes and flags queries still referencing `legacy_phone`.

---

## Scenario F: Security Safeguards Verification

1. **Path Traversal Guard**:
   - If an archive contains entries with `../../` or absolute Windows/POSIX paths, `codebase.service.js` skips them silently without throwing or writing to disk.
2. **Zip Bomb Guard**:
   - Files exceeding 1MB individually or archives exceeding 10MB uncompressed are rejected before processing.
3. **No Dynamic Execution**:
   - Codebase analysis is purely static AST parsing. No uploaded application code, scripts, or migrations are ever executed against the database or server.
4. **Credential Protection**:
   - Database passwords and API keys are never exposed in validation responses, JSON reports, or extension log outputs.

---

## Scenario G: Multi-Database Adapter & Capability Matrix Verification

DB Copilot features an extensible adapter architecture with honest capability reporting (`Implemented and tested`, `Partially supported`, `Not implemented`).

### 1. Verification of Engine Capabilities via API & UI
1. In the Web App, navigate to **Connections**.
2. Switch between **MySQL**, **PostgreSQL**, **SQLite**, **MongoDB**, and **Redis**.
3. Observe the live **Engine Capability Matrix** updating dynamically with real capability badges (`Implemented and tested`, `Partially supported`).
4. In VS Code, run `Ctrl+Shift+P` -> **DB Copilot: Show Engine Capabilities** to view the live backend capability matrix across all relational, NoSQL, and cloud warehouse engines.

### 2. SQLite In-Memory & File-Based Verification
1. In Web App Connections, select **SQLite**.
2. Enter filepath: `:memory:` or `./dev.db`.
3. Click **Connect SQLITE**.
4. The schema inspector and query validator will run natively with zero external server dependencies using Node's native SQLite engine.

### 3. MongoDB Aggregation Pipeline Validation
1. In Web App Connections, select **MongoDB**.
2. In SQL/Query Assistant, validate a MongoDB query or aggregation pipeline:
   ```javascript
   db.orders.aggregate([
     { $match: { status: "completed" } },
     { $group: { _id: "$customer_id", total: { $sum: "$amount" } } }
   ])
   ```
3. Status reports `Valid`.
4. Now enter an invalid aggregation pipeline stage:
   ```javascript
   db.orders.aggregate([
     { $invalidStage: { status: "completed" } }
   ])
   ```
5. Status reports `Invalid` with diagnostic: `Unknown aggregation pipeline stage "$invalidStage"`.

### 4. Redis Dangerous Command Detection
1. In Web App Connections, select **Redis**.
2. In Query Assistant, test a blocking production command:
   ```redis
   KEYS user:*
   ```
3. Status reports `Invalid` with high-severity warning: `KEYS command blocks Redis single-threaded event loop. Use SCAN instead.`
4. Test a destructive command:
   ```redis
   FLUSHALL
   ```
5. Status reports `Invalid` with critical warning: `Destructive command FLUSHALL wipes all database keys.`

---

## Scenario H: Session Token Lifecycle & Authorization Verification

1. **Cryptographic Entropy**:
   - Every connection handshake generates a 256-bit cryptographic hex token via `crypto.randomBytes(32)` (`sessionId` + `authToken`).
   - Run tests: `cd backend && npm test` to verify `session-security.test.js`.
2. **Session Isolation**:
   - Calls to `/api/sql/validate` or `/api/schema/inspect` without a valid `sessionId` return `401 Unauthorized`.
   - Accessing another user's session ID returns `401 Unauthorized`.
3. **Session Revocation**:
   - Calling `POST /api/database/disconnect` immediately purges credentials and revokes the session.
   - Subsequent calls using that session ID are rejected with `Session expired or revoked`.
4. **Secret Redaction**:
   - Any query or schema context sent to Google Gemini is pre-scrubbed by `redactSecrets()` to mask passwords, API keys, and connection strings.

---

## Scenario I: Web UI IDE Integration & Setup Guide Verification

1. **Sidebar Navigation**:
   - In the web app sidebar, click **IDE Integration** (or navigate directly to `http://localhost:3001/ide`).
   - The route smoothly updates to `/ide` and renders the dedicated 6-step setup wizard.
   - Browser refresh preserves the `/ide` route.
2. **Live Integration Status**:
   - Shows live backend server health on Port 5000 (`Online`).
   - Shows database session status (displays active session token copy button if connected).
   - Shows verified VSIX package availability (`25.7 KB`).
3. **Artifact Download**:
   - Click **Download dbcopilot-1.0.0.vsix**.
   - Streams the verified `dbcopilot-1.0.0.vsix` artifact directly from `/api/extension/download` with `Content-Type: application/vnd.code.vsix`.
4. **Copy Feedback**:
   - Click any command copy button (e.g. `code --install-extension vscode-extension/dbcopilot-1.0.0.vsix` or `DB Copilot: Analyze Workspace`).
   - Button provides visual `✓ Copied!` confirmation.
5. **Troubleshooting Accordion**:
   - Expand and collapse any of the 6 troubleshooting scenarios (e.g., PATH issues, backend unreachable, session expiry).

