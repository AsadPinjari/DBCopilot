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
exports.SchemaTreeProvider = exports.FindingsTreeProvider = exports.StatusTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class StatusTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    isConnected = false;
    databaseName = "";
    sessionId = "";
    summary = null;
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    updateConnection(isConnected, databaseName = "", sessionId = "") {
        this.isConnected = isConnected;
        this.databaseName = databaseName;
        this.sessionId = sessionId;
        this.refresh();
    }
    updateSummary(summary) {
        this.summary = summary;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        const items = [];
        // 1. Connection Status Item
        const connItem = new vscode.TreeItem(this.isConnected ? `Connected: ${this.databaseName}` : "Database: Not Connected", vscode.TreeItemCollapsibleState.None);
        connItem.iconPath = new vscode.ThemeIcon(this.isConnected ? "database" : "circle-slash", this.isConnected ? new vscode.ThemeColor("charts.green") : new vscode.ThemeColor("charts.red"));
        connItem.description = this.isConnected ? `Session: ${this.sessionId.slice(0, 8)}...` : "Click to connect";
        connItem.command = {
            command: this.isConnected ? "dbcopilot.disconnect" : "dbcopilot.connect",
            title: this.isConnected ? "Disconnect" : "Connect",
        };
        items.push(connItem);
        // 2. Analysis Summary Items
        if (this.summary) {
            const validItem = new vscode.TreeItem(`Valid Queries: ${this.summary.queriesValid}`, vscode.TreeItemCollapsibleState.None);
            validItem.iconPath = new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"));
            items.push(validItem);
            const invalidItem = new vscode.TreeItem(`Compatibility Issues: ${this.summary.queriesInvalid}`, vscode.TreeItemCollapsibleState.None);
            invalidItem.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
            items.push(invalidItem);
            const unsuppItem = new vscode.TreeItem(`Unsupported Queries: ${this.summary.queriesUnsupported}`, vscode.TreeItemCollapsibleState.None);
            unsuppItem.iconPath = new vscode.ThemeIcon("info", new vscode.ThemeColor("charts.yellow"));
            items.push(unsuppItem);
            const filesItem = new vscode.TreeItem(`Files Scanned: ${this.summary.filesAnalyzed} (${this.summary.filesWithDatabaseCode} with DB code)`, vscode.TreeItemCollapsibleState.None);
            filesItem.iconPath = new vscode.ThemeIcon("file-code");
            items.push(filesItem);
        }
        else {
            const noAnalysisItem = new vscode.TreeItem("Workspace not yet analyzed", vscode.TreeItemCollapsibleState.None);
            noAnalysisItem.iconPath = new vscode.ThemeIcon("sync");
            noAnalysisItem.command = {
                command: "dbcopilot.analyzeWorkspace",
                title: "Analyze Workspace",
            };
            items.push(noAnalysisItem);
        }
        return Promise.resolve(items);
    }
}
exports.StatusTreeProvider = StatusTreeProvider;
class FindingsTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    analysisResult = null;
    workspaceRootUri;
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setResult(result, rootUri) {
        this.analysisResult = result;
        this.workspaceRootUri = rootUri;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.analysisResult || !Array.isArray(this.analysisResult.files)) {
            const placeholder = new vscode.TreeItem("No compatibility issues detected.");
            placeholder.iconPath = new vscode.ThemeIcon("pass");
            return Promise.resolve([placeholder]);
        }
        // Filter files that have issues
        const filesWithIssues = this.analysisResult.files.filter((f) => (f.sqlCandidates || []).some((c) => c.validation?.status === "invalid" ||
            (c.validation?.findings && c.validation.findings.length > 0)));
        if (!element) {
            if (filesWithIssues.length === 0) {
                const item = new vscode.TreeItem("All analyzed queries are compatible!");
                item.iconPath = new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"));
                return Promise.resolve([item]);
            }
            // Root level: return files
            return Promise.resolve(filesWithIssues.map((file) => {
                const fileName = path.basename(file.path);
                const issueCount = (file.sqlCandidates || []).reduce((cnt, c) => cnt + (c.validation?.findings?.length || 0), 0);
                const item = new vscode.TreeItem(`${fileName} (${issueCount} issue${issueCount === 1 ? "" : "s"})`, vscode.TreeItemCollapsibleState.Expanded);
                item.description = path.dirname(file.path);
                item.iconPath = new vscode.ThemeIcon("file-code", new vscode.ThemeColor("charts.red"));
                item.fileData = file;
                return item;
            }));
        }
        // Child level: return findings in a file
        const file = element.fileData;
        if (!file)
            return Promise.resolve([]);
        const items = [];
        for (const candidate of file.sqlCandidates || []) {
            for (const finding of candidate.validation?.findings || []) {
                const desc = typeof finding === "string"
                    ? finding
                    : finding.message ||
                        finding.code ||
                        "Compatibility issue";
                const item = new vscode.TreeItem(`Line ${candidate.line}: ${desc}`, vscode.TreeItemCollapsibleState.None);
                item.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
                item.command = {
                    command: "dbcopilot.openFinding",
                    title: "Open in editor",
                    arguments: [file.path, candidate.line],
                };
                items.push(item);
            }
        }
        return Promise.resolve(items);
    }
}
exports.FindingsTreeProvider = FindingsTreeProvider;
class SchemaTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    tables = [];
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setTables(tables) {
        this.tables = tables;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            if (this.tables.length === 0) {
                const item = new vscode.TreeItem("No schema loaded. Connect to inspect.");
                item.iconPath = new vscode.ThemeIcon("database");
                return Promise.resolve([item]);
            }
            return Promise.resolve(this.tables.map((table) => {
                const colCount = table.columns?.length || 0;
                const item = new vscode.TreeItem(`${table.name} (${colCount} cols)`, vscode.TreeItemCollapsibleState.Collapsed);
                item.iconPath = new vscode.ThemeIcon("table");
                item.tableData = table;
                return item;
            }));
        }
        const table = element.tableData;
        if (!table || !table.columns)
            return Promise.resolve([]);
        return Promise.resolve(table.columns.map((col) => {
            let label = col.name;
            if (col.primaryKey)
                label += " (PK)";
            if (col.foreignKey)
                label += " (FK)";
            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.description = col.fullType || col.type || "";
            item.iconPath = new vscode.ThemeIcon(col.primaryKey ? "key" : col.foreignKey ? "link" : "symbol-field");
            return item;
        }));
    }
}
exports.SchemaTreeProvider = SchemaTreeProvider;
//# sourceMappingURL=treeViews.js.map