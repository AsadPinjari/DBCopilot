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
exports.DBCopilotCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
class DBCopilotCodeActionProvider {
    static providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];
    provideCodeActions(document, range, context) {
        const actions = [];
        const dbCopilotDiagnostics = context.diagnostics.filter((diag) => diag.source === "DB Copilot");
        if (dbCopilotDiagnostics.length === 0) {
            return actions;
        }
        const currentLineText = document.lineAt(range.start.line).text;
        // Action 1: Explain with AI
        const explainAction = new vscode.CodeAction("DB Copilot: Explain this database issue with AI", vscode.CodeActionKind.QuickFix);
        explainAction.command = {
            command: "dbcopilot.explainSelection",
            title: "Explain with AI",
            arguments: [currentLineText],
        };
        explainAction.isPreferred = true;
        actions.push(explainAction);
        // Action 2: Generate Fix with AI
        const fixAction = new vscode.CodeAction("DB Copilot: Generate and review fix with AI", vscode.CodeActionKind.QuickFix);
        fixAction.command = {
            command: "dbcopilot.applyCorrection",
            title: "Generate Fix",
            arguments: [document, range.start.line],
        };
        actions.push(fixAction);
        // Action 3: Re-analyze file
        const reanalyzeAction = new vscode.CodeAction("DB Copilot: Re-analyze current file", vscode.CodeActionKind.QuickFix);
        reanalyzeAction.command = {
            command: "dbcopilot.analyzeActiveFile",
            title: "Re-analyze File",
        };
        actions.push(reanalyzeAction);
        return actions;
    }
}
exports.DBCopilotCodeActionProvider = DBCopilotCodeActionProvider;
//# sourceMappingURL=codeActions.js.map