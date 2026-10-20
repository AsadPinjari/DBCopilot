import * as vscode from "vscode";

export class DBCopilotCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const dbCopilotDiagnostics = context.diagnostics.filter(
      (diag) => diag.source === "DB Copilot"
    );

    if (dbCopilotDiagnostics.length === 0) {
      return actions;
    }

    const currentLineText = document.lineAt(range.start.line).text;

    // Action 1: Explain with AI
    const explainAction = new vscode.CodeAction(
      "DB Copilot: Explain this database issue with AI",
      vscode.CodeActionKind.QuickFix
    );
    explainAction.command = {
      command: "dbcopilot.explainSelection",
      title: "Explain with AI",
      arguments: [currentLineText],
    };
    explainAction.isPreferred = true;
    actions.push(explainAction);

    // Action 2: Generate Fix with AI
    const fixAction = new vscode.CodeAction(
      "DB Copilot: Generate and review fix with AI",
      vscode.CodeActionKind.QuickFix
    );
    fixAction.command = {
      command: "dbcopilot.applyCorrection",
      title: "Generate Fix",
      arguments: [document, range.start.line],
    };
    actions.push(fixAction);

    // Action 3: Re-analyze file
    const reanalyzeAction = new vscode.CodeAction(
      "DB Copilot: Re-analyze current file",
      vscode.CodeActionKind.QuickFix
    );
    reanalyzeAction.command = {
      command: "dbcopilot.analyzeActiveFile",
      title: "Re-analyze File",
    };
    actions.push(reanalyzeAction);

    return actions;
  }
}
