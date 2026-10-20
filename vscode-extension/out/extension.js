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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const apiClient_1 = require("./apiClient");
const diagnostics_1 = require("./diagnostics");
const codeActions_1 = require("./codeActions");
const treeViews_1 = require("./treeViews");
let currentSessionId = "";
let currentDatabase = "";
let lastAnalysisResult = null;
function activate(context) {
    console.log("DB Copilot extension is now active.");
    // Diagnostics collection
    const diagnosticCollection = vscode.languages.createDiagnosticCollection("dbcopilot");
    context.subscriptions.push(diagnosticCollection);
    // Tree view providers
    const statusTreeProvider = new treeViews_1.StatusTreeProvider();
    const findingsTreeProvider = new treeViews_1.FindingsTreeProvider();
    const schemaTreeProvider = new treeViews_1.SchemaTreeProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider("dbcopilot.statusView", statusTreeProvider), vscode.window.registerTreeDataProvider("dbcopilot.findingsView", findingsTreeProvider), vscode.window.registerTreeDataProvider("dbcopilot.schemaView", schemaTreeProvider));
    // Code actions provider
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider([
        { scheme: "file", language: "javascript" },
        { scheme: "file", language: "typescript" },
        { scheme: "file", language: "sql" },
    ], new codeActions_1.DBCopilotCodeActionProvider(), {
        providedCodeActionKinds: codeActions_1.DBCopilotCodeActionProvider.providedCodeActionKinds,
    }));
    // Read configured sessionId if already saved
    const config = vscode.workspace.getConfiguration("dbcopilot");
    const savedSessionId = config.get("sessionId", "");
    if (savedSessionId) {
        currentSessionId = savedSessionId;
    }
    // Helper to ensure database is connected
    async function ensureSession() {
        if (currentSessionId) {
            return currentSessionId;
        }
        const answer = await vscode.window.showWarningMessage("No active database session. Connect to a database first?", "Connect Database", "Cancel");
        if (answer === "Connect Database") {
            await vscode.commands.executeCommand("dbcopilot.connect");
            return currentSessionId || null;
        }
        return null;
    }
    // Command: Connect Database
    const connectCmd = vscode.commands.registerCommand("dbcopilot.connect", async () => {
        try {
            const enginePick = await vscode.window.showQuickPick([
                { label: "MySQL", description: "Relational (Default Port 3306)", engine: "mysql" },
                { label: "PostgreSQL", description: "Relational (Default Port 5432)", engine: "postgres" },
                { label: "SQLite", description: "Embedded database file / :memory:", engine: "sqlite" },
                { label: "MongoDB", description: "NoSQL document store (Port 27017)", engine: "mongodb" },
                { label: "Redis", description: "In-memory key-value store (Port 6379)", engine: "redis" },
            ], { placeHolder: "Select Database Engine to Connect" });
            if (!enginePick)
                return;
            const selectedEngine = enginePick.engine;
            let credentials = { engine: selectedEngine };
            let databaseDisplayName = "";
            if (selectedEngine === "sqlite") {
                const filepath = await vscode.window.showInputBox({
                    prompt: "SQLite Database File Path (or :memory:)",
                    value: "./dev.db",
                    placeHolder: "./dev.db or :memory:",
                });
                if (!filepath) {
                    vscode.window.showErrorMessage("SQLite database file path is required.");
                    return;
                }
                credentials.filepath = filepath;
                databaseDisplayName = filepath;
            }
            else if (selectedEngine === "mongodb") {
                const uri = await vscode.window.showInputBox({
                    prompt: "MongoDB Connection URI (leave blank for host/port form)",
                    placeHolder: "mongodb://localhost:27017/store",
                });
                if (uri) {
                    credentials.uri = uri;
                    databaseDisplayName = "mongodb";
                }
                else {
                    const host = (await vscode.window.showInputBox({ prompt: "MongoDB Host", value: "localhost" })) || "localhost";
                    const portStr = (await vscode.window.showInputBox({ prompt: "MongoDB Port", value: "27017" })) || "27017";
                    const database = await vscode.window.showInputBox({ prompt: "MongoDB Database Name", placeHolder: "e.g. store" });
                    if (!database) {
                        vscode.window.showErrorMessage("Database name is required.");
                        return;
                    }
                    const username = await vscode.window.showInputBox({ prompt: "Username (optional)" });
                    const password = (await vscode.window.showInputBox({ prompt: "Password (optional)", password: true })) ?? "";
                    credentials = { engine: "mongodb", host, port: Number(portStr), database, username, password };
                    databaseDisplayName = database;
                }
            }
            else if (selectedEngine === "redis") {
                const host = (await vscode.window.showInputBox({ prompt: "Redis Host", value: "127.0.0.1" })) || "127.0.0.1";
                const portStr = (await vscode.window.showInputBox({ prompt: "Redis Port", value: "6379" })) || "6379";
                const password = (await vscode.window.showInputBox({ prompt: "Redis Password (optional)", password: true })) ?? "";
                credentials = { engine: "redis", host, port: Number(portStr), password };
                databaseDisplayName = `redis://${host}:${portStr}`;
            }
            else {
                // Relational (MySQL / PostgreSQL / MariaDB)
                const defaultPort = selectedEngine === "postgres" ? "5432" : "3306";
                const defaultUser = selectedEngine === "postgres" ? "postgres" : "root";
                const host = (await vscode.window.showInputBox({ prompt: "Database Host", value: "localhost" })) || "localhost";
                const portStr = (await vscode.window.showInputBox({ prompt: "Database Port", value: defaultPort })) || defaultPort;
                const username = (await vscode.window.showInputBox({ prompt: "Database Username", value: defaultUser })) || defaultUser;
                const password = (await vscode.window.showInputBox({ prompt: "Database Password", password: true })) ?? "";
                const database = await vscode.window.showInputBox({ prompt: "Database Name", placeHolder: "e.g. ordermng or dbcopilot_demo" });
                if (!database) {
                    vscode.window.showErrorMessage("Database name is required.");
                    return;
                }
                credentials = {
                    engine: selectedEngine,
                    host,
                    port: Number(portStr),
                    username,
                    password,
                    database,
                };
                databaseDisplayName = database;
            }
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Connecting to ${enginePick.label} ("${databaseDisplayName}")...`,
            }, async () => {
                const res = await apiClient_1.DBCopilotApiClient.connect(credentials);
                currentSessionId = res.sessionId;
                currentDatabase = databaseDisplayName;
                // Save to configuration
                await config.update("sessionId", res.sessionId, vscode.ConfigurationTarget.Global);
                // Fetch live schema
                const schemaRes = await apiClient_1.DBCopilotApiClient.inspectSchema(currentSessionId);
                const tables = schemaRes.schema.tables || [];
                statusTreeProvider.updateConnection(true, databaseDisplayName, currentSessionId);
                schemaTreeProvider.setTables(tables);
                vscode.window.showInformationMessage(`DB Copilot: Connected to ${enginePick.label} "${databaseDisplayName}" (${tables.length} tables/collections found).`);
                // Automatically analyze workspace on initial connect
                if (vscode.workspace.workspaceFolders?.length) {
                    await vscode.commands.executeCommand("dbcopilot.analyzeWorkspace");
                }
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`DB Copilot connection error: ${err.message}`);
        }
    });
    context.subscriptions.push(connectCmd);
    // Command: Show Engine Capabilities
    const showCapCmd = vscode.commands.registerCommand("dbcopilot.showCapabilities", async () => {
        try {
            const res = await apiClient_1.DBCopilotApiClient.getCapabilities();
            const items = Object.entries(res.engines).map(([name, caps]) => ({
                label: `${name.toUpperCase()}`,
                description: `Conn: ${caps["Connection & Authentication"]} | Query: ${caps["Query Validation"]}`,
                detail: `Schema: ${caps["Schema Inspection"]} | Code: ${caps["Codebase Query Detection"]}`,
            }));
            await vscode.window.showQuickPick(items, {
                placeHolder: "DB Copilot Engine Capabilities Matrix (Live from Backend)",
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to fetch capabilities: ${err.message}`);
        }
    });
    context.subscriptions.push(showCapCmd);
    // Command: Disconnect Database
    const disconnectCmd = vscode.commands.registerCommand("dbcopilot.disconnect", async () => {
        if (!currentSessionId)
            return;
        try {
            await apiClient_1.DBCopilotApiClient.disconnect(currentSessionId);
        }
        catch {
            // Ignore network errors on disconnect
        }
        finally {
            currentSessionId = "";
            currentDatabase = "";
            diagnosticCollection.clear();
            statusTreeProvider.updateConnection(false);
            schemaTreeProvider.setTables([]);
            findingsTreeProvider.setResult(null);
            await config.update("sessionId", "", vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage("DB Copilot: Database disconnected.");
        }
    });
    context.subscriptions.push(disconnectCmd);
    // Command: Analyze Workspace
    const analyzeWorkspaceCmd = vscode.commands.registerCommand("dbcopilot.analyzeWorkspace", async () => {
        const sessionId = await ensureSession();
        if (!sessionId)
            return;
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showWarningMessage("DB Copilot: Open a folder or workspace to analyze.");
            return;
        }
        const rootUri = folders[0].uri;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "DB Copilot: Analyzing workspace for SQL compatibility...",
            cancellable: false,
        }, async () => {
            try {
                // Find all database-related source files in workspace
                const foundUris = await vscode.workspace.findFiles("**/*.{js,jsx,ts,tsx,sql}", "**/{node_modules,.git,.next,dist,build,coverage}/**", 500);
                if (foundUris.length === 0) {
                    vscode.window.showInformationMessage("DB Copilot: No supported source files (.js, .ts, .sql) found in workspace.");
                    return;
                }
                const filesPayload = [];
                for (const uri of foundUris) {
                    const relPath = path
                        .relative(rootUri.fsPath, uri.fsPath)
                        .replace(/\\/g, "/");
                    try {
                        const data = await vscode.workspace.fs.readFile(uri);
                        const content = Buffer.from(data).toString("utf8");
                        filesPayload.push({ path: relPath, content });
                    }
                    catch {
                        // Skip unreadable files
                    }
                }
                const response = await apiClient_1.DBCopilotApiClient.analyzeFiles(sessionId, filesPayload);
                lastAnalysisResult = response.result;
                // Update diagnostics in all files
                (0, diagnostics_1.updateDiagnostics)(diagnosticCollection, response.result, rootUri);
                // Update sidebar tree views
                statusTreeProvider.updateSummary(response.result.summary);
                findingsTreeProvider.setResult(response.result, rootUri);
                const { queriesValidated, queriesInvalid, queriesValid } = response.result.summary;
                if (queriesInvalid > 0) {
                    vscode.window.showWarningMessage(`DB Copilot: Found ${queriesInvalid} compatibility issue(s) across ${queriesValidated} validated query/queries.`);
                }
                else {
                    vscode.window.showInformationMessage(`DB Copilot: All ${queriesValid} query/queries in workspace are compatible with database "${currentDatabase}".`);
                }
            }
            catch (err) {
                vscode.window.showErrorMessage(`DB Copilot analysis failed: ${err.message}`);
            }
        });
    });
    context.subscriptions.push(analyzeWorkspaceCmd);
    // Command: Analyze Active File
    const analyzeActiveFileCmd = vscode.commands.registerCommand("dbcopilot.analyzeActiveFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor.");
            return;
        }
        const sessionId = await ensureSession();
        if (!sessionId)
            return;
        const doc = editor.document;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
        const rootUri = workspaceFolder ? workspaceFolder.uri : undefined;
        const relPath = rootUri
            ? path.relative(rootUri.fsPath, doc.uri.fsPath).replace(/\\/g, "/")
            : path.basename(doc.uri.fsPath);
        try {
            const res = await apiClient_1.DBCopilotApiClient.analyzeFiles(sessionId, [
                { path: relPath, content: doc.getText() },
            ]);
            (0, diagnostics_1.updateDiagnostics)(diagnosticCollection, res.result, rootUri);
            findingsTreeProvider.setResult(res.result, rootUri);
            vscode.window.showInformationMessage(`DB Copilot: Analyzed ${path.basename(doc.fileName)}. Issues: ${res.result.summary.queriesInvalid}`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`DB Copilot file analysis error: ${err.message}`);
        }
    });
    context.subscriptions.push(analyzeActiveFileCmd);
    // Command: Validate Selected SQL
    const validateSelectionCmd = vscode.commands.registerCommand("dbcopilot.validateSelection", async () => {
        const editor = vscode.window.activeTextEditor;
        let sql = "";
        if (editor && !editor.selection.isEmpty) {
            sql = editor.document.getText(editor.selection);
        }
        else if (editor) {
            sql = editor.document.lineAt(editor.selection.start.line).text;
        }
        if (!sql.trim()) {
            sql =
                (await vscode.window.showInputBox({
                    prompt: "Enter SQL query to validate against schema",
                    placeHolder: "SELECT * FROM orders;",
                })) || "";
        }
        if (!sql.trim())
            return;
        const sessionId = await ensureSession();
        if (!sessionId)
            return;
        try {
            const res = await apiClient_1.DBCopilotApiClient.validateSQL(sessionId, sql.trim());
            const { validation } = res.result;
            if (validation.status === "valid") {
                vscode.window.showInformationMessage(`DB Copilot: Query is valid and compatible with schema "${currentDatabase}".`);
            }
            else if (validation.status === "invalid") {
                const firstFinding = validation.findings?.[0];
                const desc = typeof firstFinding === "string"
                    ? firstFinding
                    : firstFinding?.message || "Incompatible query";
                vscode.window.showErrorMessage(`DB Copilot: Query is invalid: ${desc}`);
            }
            else {
                vscode.window.showWarningMessage("DB Copilot: Query uses unsupported SQL syntax.");
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`DB Copilot validation failed: ${err.message}`);
        }
    });
    context.subscriptions.push(validateSelectionCmd);
    // Command: Explain Selected SQL with AI
    const explainSelectionCmd = vscode.commands.registerCommand("dbcopilot.explainSelection", async (providedSql) => {
        const editor = vscode.window.activeTextEditor;
        let sql = providedSql || "";
        if (!sql && editor && !editor.selection.isEmpty) {
            sql = editor.document.getText(editor.selection);
        }
        else if (!sql && editor) {
            sql = editor.document.lineAt(editor.selection.start.line).text;
        }
        if (!sql.trim()) {
            sql =
                (await vscode.window.showInputBox({
                    prompt: "Enter SQL query to explain with DB Copilot AI",
                    placeHolder: "SELECT id, name FROM users;",
                })) || "";
        }
        if (!sql.trim())
            return;
        const sessionId = await ensureSession();
        if (!sessionId)
            return;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "DB Copilot: Asking AI to explain and suggest corrections...",
        }, async () => {
            try {
                const res = await apiClient_1.DBCopilotApiClient.explainSQL(sessionId, sql.trim());
                const { explanation, reasoning, suggestedSql } = res.result;
                // Show in Webview Panel
                const panel = vscode.window.createWebviewPanel("dbcopilot.explanation", "DB Copilot: SQL Explanation", vscode.ViewColumn.Beside, { enableScripts: false });
                panel.webview.html = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; line-height: 1.6; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
                  h2, h3 { color: var(--vscode-textLink-foreground); }
                  pre { background-color: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 6px; overflow-x: auto; font-family: var(--vscode-editor-font-family); font-size: 13px; }
                  .card { border: 1px solid var(--vscode-widget-border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
                  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
                </style>
              </head>
              <body>
                <h2>DB Copilot — SQL Analysis & Fix</h2>
                <div class="card">
                  <span class="badge">Original SQL</span>
                  <pre>${escapeHtml(sql)}</pre>
                </div>
                <div class="card">
                  <h3>Explanation</h3>
                  <p>${escapeHtml(explanation)}</p>
                </div>
                ${reasoning
                    ? `<div class="card">
                        <h3>Reasoning</h3>
                        <p>${escapeHtml(reasoning)}</p>
                      </div>`
                    : ""}
                ${suggestedSql
                    ? `<div class="card">
                        <span class="badge" style="background-color: #10b981; color: white;">Suggested Correction</span>
                        <pre>${escapeHtml(suggestedSql)}</pre>
                      </div>`
                    : ""}
              </body>
              </html>
            `;
            }
            catch (err) {
                vscode.window.showErrorMessage(`DB Copilot AI Explain failed: ${err.message}`);
            }
        });
    });
    context.subscriptions.push(explainSelectionCmd);
    // Command: Apply Suggested Fix (Quick Fix Workflow)
    const applyCorrectionCmd = vscode.commands.registerCommand("dbcopilot.applyCorrection", async (doc, lineIndex) => {
        const editor = vscode.window.activeTextEditor;
        const targetDoc = doc || editor?.document;
        const targetLine = lineIndex ?? editor?.selection.start.line ?? 0;
        if (!targetDoc)
            return;
        const sessionId = await ensureSession();
        if (!sessionId)
            return;
        const lineText = targetDoc.lineAt(targetLine).text;
        // Extract SQL string from the line
        const sqlMatch = lineText.match(/(["'`])((?:SELECT)[\s\S]*?)\1/i);
        const queryToFix = sqlMatch ? sqlMatch[2] : lineText;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "DB Copilot: Generating suggested correction with AI...",
        }, async () => {
            try {
                const res = await apiClient_1.DBCopilotApiClient.explainSQL(sessionId, queryToFix);
                const { suggestedSql, explanation } = res.result;
                if (!suggestedSql) {
                    vscode.window.showInformationMessage(`DB Copilot: Could not infer a safe SQL correction. Explanation: ${explanation}`);
                    return;
                }
                const confirm = await vscode.window.showInformationMessage(`Suggested Fix: "${suggestedSql}"\n\nApply this correction to line ${targetLine + 1}?`, "Apply Fix", "Cancel");
                if (confirm === "Apply Fix") {
                    const edit = new vscode.WorkspaceEdit();
                    const quote = sqlMatch ? sqlMatch[1] : '"';
                    const replacement = sqlMatch
                        ? lineText.replace(sqlMatch[0], `${quote}${suggestedSql}${quote}`)
                        : suggestedSql;
                    edit.replace(targetDoc.uri, targetDoc.lineAt(targetLine).range, replacement);
                    const applied = await vscode.workspace.applyEdit(edit);
                    if (applied) {
                        vscode.window.showInformationMessage("DB Copilot: Correction applied. Re-analyzing...");
                        await vscode.commands.executeCommand("dbcopilot.analyzeActiveFile");
                    }
                }
            }
            catch (err) {
                vscode.window.showErrorMessage(`DB Copilot fix failed: ${err.message}`);
            }
        });
    });
    context.subscriptions.push(applyCorrectionCmd);
    // Command: Open Finding in Editor
    const openFindingCmd = vscode.commands.registerCommand("dbcopilot.openFinding", async (relPath, line) => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length)
            return;
        const fullUri = path.isAbsolute(relPath)
            ? vscode.Uri.file(relPath)
            : vscode.Uri.joinPath(folders[0].uri, relPath);
        try {
            const doc = await vscode.workspace.openTextDocument(fullUri);
            const editor = await vscode.window.showTextDocument(doc);
            const targetLine = Math.max(0, line - 1);
            const pos = new vscode.Position(targetLine, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Could not open file: ${err.message}`);
        }
    });
    context.subscriptions.push(openFindingCmd);
    // Command: Compare Schema Drift
    const compareDriftCmd = vscode.commands.registerCommand("dbcopilot.compareSchemaDrift", async () => {
        const sessionId = await ensureSession();
        if (!sessionId)
            return;
        try {
            const snapshotRes = await apiClient_1.DBCopilotApiClient.getSchemaSnapshot(sessionId);
            const compareRes = await apiClient_1.DBCopilotApiClient.compareSchemaDrift(sessionId, snapshotRes.snapshot, lastAnalysisResult);
            const report = compareRes.report;
            const msg = report.hasDrift
                ? `Schema Drift Detected: ${report.summary.breakingChangesCount} breaking change(s).`
                : "Database schema is synchronized with expected application definitions.";
            vscode.window.showInformationMessage(`DB Copilot: ${msg}`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Schema drift comparison failed: ${err.message}`);
        }
    });
    context.subscriptions.push(compareDriftCmd);
    // Hook: Auto-analyze on save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (doc) => {
        const autoAnalyze = vscode.workspace
            .getConfiguration("dbcopilot")
            .get("autoAnalyzeOnSave", true);
        if (!autoAnalyze || !currentSessionId)
            return;
        const ext = path.extname(doc.fileName).toLowerCase();
        if ([".js", ".jsx", ".ts", ".tsx", ".sql"].includes(ext)) {
            await vscode.commands.executeCommand("dbcopilot.analyzeActiveFile");
        }
    }));
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function deactivate() { }
//# sourceMappingURL=extension.js.map