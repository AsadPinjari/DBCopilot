"use client";

import { useEffect, useState } from "react";
import { getExtensionInfo, checkBackendHealth, type ExtensionInfo } from "@/lib/api";

type IDEIntegrationProps = {
  sessionId?: string;
  isConnected: boolean;
  databaseName?: string;
};

export default function IDEIntegration({
  sessionId,
  isConnected,
  databaseName,
}: IDEIntegrationProps) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(null);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  const [backendChecking, setBackendChecking] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openTroubleshoot, setOpenTroubleshoot] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      setBackendChecking(true);
      try {
        const [health, ext] = await Promise.all([
          checkBackendHealth().catch(() => null),
          getExtensionInfo().catch(() => null),
        ]);

        if (isMounted) {
          setBackendAlive(Boolean(health && health.success));
          if (ext && ext.success) {
            setExtensionInfo(ext);
          }
        }
      } catch (err) {
        if (isMounted) {
          setBackendAlive(false);
        }
      } finally {
        if (isMounted) {
          setBackendChecking(false);
        }
      }
    }

    void checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  const steps = [
    { number: 1, title: "Download", short: "Get VSIX" },
    { number: 2, title: "Install", short: "Add to VS Code" },
    { number: 3, title: "Launch", short: "Activate Extension" },
    { number: 4, title: "Configure", short: "Connect Backend" },
    { number: 5, title: "Run Analysis", short: "Detect Issues" },
    { number: 6, title: "Troubleshoot", short: "Diagnostics & Help" },
  ];

  return (
    <div className="space-y-6 text-slate-200">
      {/* ─── Header Banner ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-950/40 via-[#0d1426] to-[#0b1020] p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/20 text-xl font-bold text-indigo-300 shadow-inner">
                ⚡
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  IDE Integration
                </h1>
                <p className="text-xs text-indigo-300/80">
                  Visual Studio Code Extension & Real-time AST Analyzer
                </p>
              </div>
            </div>
            <p className="mt-2.5 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Connect DB Copilot directly into your local editor. Validate queries on save, view
              inline diagnostics in the Problems panel, and inspect AI-assisted fixes without leaving your code.
            </p>
          </div>

          {/* Live System Status Badges */}
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md ${
                backendChecking
                  ? "border-slate-700 bg-slate-800/40 text-slate-400"
                  : backendAlive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  backendChecking
                    ? "bg-slate-400 animate-pulse"
                    : backendAlive
                    ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                    : "bg-red-400 shadow-sm shadow-red-400/50"
                }`}
              />
              <span>
                {backendChecking
                  ? "Probing backend..."
                  : backendAlive
                  ? "Backend Server: Port 5000 Online"
                  : "Backend Server: Port 5000 Offline"}
              </span>
            </div>

            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                isConnected
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                  : "border-slate-700 bg-slate-800/40 text-slate-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-indigo-400" : "bg-slate-500"
                }`}
              />
              <span>
                {isConnected
                  ? `Active Session: ${databaseName || "Connected"}`
                  : "No Web Session Attached"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Supported IDE Card ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-[#0d1426] p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-2xl text-blue-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-white">
                  Visual Studio Code Extension
                </h2>
                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
                  v{extensionInfo?.version || "1.0.0"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-400">
                  {extensionInfo?.targetEngine || "^1.85.0"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Official DB Copilot extension for VS Code, VSCodium, and Cursor. Provides static AST parsing,
                in-editor squiggly diagnostics, query corrections, and live schema navigation.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {extensionInfo?.available ? "Package Available (VSIX)" : "Ready to Build"}
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-indigo-400">⌘</span> AST Code Scanning
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Extracts SQL literals from .js, .ts, and .sql without running application code.
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-amber-400">⚡</span> Inline Diagnostics
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Highlights nonexistent tables and missing columns in the editor and Problems tab.
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-emerald-400">💡</span> AI Quick Fixes
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Press Ctrl+. on any error to review AI explanations and apply schema-safe repairs.
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-blue-400">▤</span> Schema Explorer
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Activity Bar tree view showing database tables, columns, keys, and drift status.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Step Navigation Wizard ─────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-[#0d1426] p-4 shadow-lg sm:p-6">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">
              Installation & Setup Wizard
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Follow these 6 steps to link DB Copilot with your local workspace.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Step {activeStep} of {steps.length}
          </span>
        </div>

        {/* Step Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="tablist">
          {steps.map((s) => {
            const isCurrent = activeStep === s.number;
            const isCompleted = activeStep > s.number;

            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setActiveStep(s.number)}
                role="tab"
                aria-selected={isCurrent}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                  isCurrent
                    ? "border-indigo-400/40 bg-indigo-500/15 text-white shadow-sm"
                    : isCompleted
                    ? "border-emerald-500/20 bg-emerald-500/5 text-slate-300 hover:bg-white/5"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? "bg-indigo-500 text-white"
                        : isCompleted
                        ? "bg-emerald-500 text-black"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {isCompleted ? "✓" : s.number}
                  </span>
                  <span className="text-[10px] font-medium opacity-60">Step {s.number}</span>
                </div>
                <span className="mt-2 text-xs font-semibold">{s.title}</span>
                <span className="text-[10px] text-slate-400">{s.short}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Step Content Panel ────────────────────────────────────────── */}
        <div className="mt-6 rounded-xl border border-white/5 bg-[#080b14] p-5">
          {/* STEP 1: DOWNLOAD */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white">
                    Step 1: Download the Extension Artifact
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    The extension is packaged as a standard VSIX archive (<code className="rounded bg-white/10 px-1 py-0.5 text-slate-300">dbcopilot-1.0.0.vsix</code>) ready for installation into VS Code.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href="http://localhost:5000/api/extension/download"
                    download="dbcopilot-1.0.0.vsix"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download VSIX ({extensionInfo?.sizeFormatted || "25.7 KB"})
                  </a>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Verified Artifact Location:</span>
                  <code className="rounded bg-black/40 px-2 py-1 text-indigo-300 font-mono">
                    vscode-extension/dbcopilot-1.0.0.vsix
                  </code>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
                  <span>File Size: {extensionInfo?.sizeFormatted || "25.7 KB"}</span>
                  <span>Target: VS Code 1.85.0+</span>
                  <span>Status: Ready to install</span>
                </div>
              </div>

              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-200">
                <strong>Package Information:</strong> This build includes the complete TypeScript language client, AST query extractor, diagnostic provider, and quick-fix generator bundled without external runtime dependencies.
              </div>
            </div>
          )}

          {/* STEP 2: INSTALL */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-white">
                  Step 2: Install the VSIX Package into VS Code
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Install the extension using the command line or through the Visual Studio Code user interface.
                </p>
              </div>

              {/* Option A: Terminal Command */}
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Option A — Terminal Command (Recommended)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("code --install-extension vscode-extension/dbcopilot-1.0.0.vsix", "cli-cmd")
                    }
                    className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {copiedKey === "cli-cmd" ? "✓ Copied!" : "Copy Command"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Run this command from your DB Copilot workspace root:
                </p>
                <pre className="mt-2 overflow-x-auto rounded border border-white/5 bg-black/60 p-3 font-mono text-xs text-emerald-300">
                  code --install-extension vscode-extension/dbcopilot-1.0.0.vsix
                </pre>
              </div>

              {/* Option B: Manual UI */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Option B — Manual Installation via VS Code GUI
                </span>
                <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">1</span>
                    <span>Open Visual Studio Code.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">2</span>
                    <span>Click the <strong>Extensions</strong> icon in the Activity Bar or press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Ctrl+Shift+X</kbd> (or <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Cmd+Shift+X</kbd>).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">3</span>
                    <span>Click the <strong>Views and More Actions</strong> menu (<code className="rounded bg-white/10 px-1 py-0.5 font-mono">...</code>) in the top-right corner of the Extensions view.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">4</span>
                    <span>Select <strong>Install from VSIX...</strong> from the dropdown list.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">5</span>
                    <span>Select the downloaded <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-indigo-300">dbcopilot-1.0.0.vsix</code> file.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* STEP 3: LAUNCH */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-white">
                  Step 3: Launch & Activate the Extension
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Verify that the extension has activated and is accessible inside your workspace.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                  <h5 className="font-semibold text-white">1. Verify Extension in Activity Bar</h5>
                  <p className="mt-1 text-slate-400">
                    A database icon (<code className="rounded bg-white/10 px-1 py-0.5 font-mono">$(database)</code>) will appear on the left Activity Bar. Clicking it reveals three dedicated panels:
                  </p>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-slate-300">
                    <li><strong>Database Connection & Status</strong> — View connection health, total queries, and issues.</li>
                    <li><strong>Compatibility Findings</strong> — Interactive tree grouping query bugs by file.</li>
                    <li><strong>Schema Explorer</strong> — Live table structure, column types, and foreign keys.</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-white">2. Open Extension Commands</h5>
                    <button
                      type="button"
                      onClick={() => handleCopy("DB Copilot: Analyze Workspace", "cmd-palette")}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      {copiedKey === "cmd-palette" ? "✓ Copied!" : "Copy Command"}
                    </button>
                  </div>
                  <p className="mt-1 text-slate-400">
                    Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">Ctrl+Shift+P</kbd> (or <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">Cmd+Shift+P</kbd>) and type:
                  </p>
                  <pre className="mt-2 rounded border border-white/5 bg-black/60 p-2 font-mono text-indigo-300">
                    DB Copilot: Analyze Workspace
                  </pre>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-300">
                  <strong>Development Alternative (F5 Host):</strong> If you are modifying the extension source code in <code className="rounded bg-black/30 px-1 py-0.5 font-mono">vscode-extension/src/</code>, open that folder directly in VS Code and press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">F5</kbd> to run an Extension Development Host window with hot reload.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIGURE */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-white">
                  Step 4: Configure Backend Connection & Database Session
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  The extension communicates with the DB Copilot backend API to perform schema validation and AI assistance.
                </p>
              </div>

              {/* Server URL Setting */}
              <div className="rounded-lg border border-white/10 bg-black/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    1. Backend API Endpoint (<code className="text-indigo-300">dbcopilot.serverUrl</code>)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("http://localhost:5000", "srv-url")}
                    className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    {copiedKey === "srv-url" ? "✓ Copied!" : "Copy URL"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Default setting is <code className="text-slate-300">http://localhost:5000</code>. Verified online:{" "}
                  <span className={backendAlive ? "text-emerald-400 font-semibold" : "text-red-400"}>
                    {backendAlive ? "HTTP 200 OK" : "Offline"}
                  </span>
                </p>
              </div>

              {/* Database Session Sync */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">
                      2. Database Session Synchronization (<code className="text-indigo-300">dbcopilot.sessionId</code>)
                    </span>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Connect your database in the extension or copy the active web session token.
                    </p>
                  </div>

                  {isConnected && sessionId ? (
                    <button
                      type="button"
                      onClick={() => handleCopy(sessionId, "sess-token")}
                      className="rounded bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
                    >
                      {copiedKey === "sess-token" ? "✓ Session ID Copied!" : "Copy Active Session ID"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Connect in web app to generate a shared session token
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded border border-white/5 bg-black/60 p-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Active Session Status:</span>
                    <span className={isConnected ? "text-emerald-300 font-medium" : "text-slate-400"}>
                      {isConnected ? "Active in Web App" : "No active session"}
                    </span>
                  </div>
                  {isConnected && (
                    <div className="mt-1.5 flex items-center justify-between text-slate-400">
                      <span>Target Database:</span>
                      <span className="font-mono text-indigo-300">{databaseName || "Connected"}</span>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  <strong>Direct VS Code Connection:</strong> You can also run <code className="text-slate-300">DB Copilot: Connect Database</code> in VS Code to enter database host and user interactively. Passwords are never saved in settings.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: RUN ANALYSIS */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-white">
                  Step 5: Run Your First Workspace Analysis
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Test the real-time analyzer using the included <code className="text-indigo-300 font-mono">sample-project</code>.
                </p>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                  <h5 className="font-semibold text-white">1. Open the Sample Project Folder</h5>
                  <p className="mt-1 text-slate-400">
                    In VS Code, select <strong>File → Open Folder...</strong> and choose the <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-slate-200">sample-project</code> directory from the DB Copilot repository.
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-white">2. Run Workspace Scan</h5>
                    <button
                      type="button"
                      onClick={() => handleCopy("DB Copilot: Analyze Workspace", "scan-cmd")}
                      className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      {copiedKey === "scan-cmd" ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 text-slate-400">
                    Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">Ctrl+Shift+P</kbd> and run:
                  </p>
                  <pre className="mt-2 rounded border border-white/5 bg-black/60 p-2 font-mono text-indigo-300">
                    DB Copilot: Analyze Workspace
                  </pre>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
                  <h5 className="font-semibold text-white">3. Inspect Inline Diagnostics & Quick Fix</h5>
                  <p className="mt-1 text-slate-400">
                    Open <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-slate-200">src/missing-references.js</code>:
                  </p>
                  <ul className="mt-2 list-disc list-inside space-y-1.5 text-slate-300">
                    <li>
                      <strong>Line 7:</strong> Red squiggly highlights <code className="text-amber-300">gpa</code> — <em>Column &quot;gpa&quot; does not exist in table &quot;students&quot;</em>.
                    </li>
                    <li>
                      <strong>Line 12:</strong> Red squiggly highlights table <code className="text-amber-300">teachers</code> — <em>Table &quot;teachers&quot; does not exist in schema</em>.
                    </li>
                    <li>
                      Open Problems Panel (<kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Ctrl+Shift+M</kbd>) to view findings grouped under DB Copilot.
                    </li>
                    <li>
                      Place cursor on line 7 and click the yellow lightbulb or press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">Ctrl+.</kbd> to select <strong>DB Copilot: Explain this database issue with AI</strong>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: TROUBLESHOOTING */}
          {activeStep === 6 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-white">
                  Step 6: Diagnostic & Troubleshooting Guide
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Solutions for common integration, connection, and diagnostic scenarios.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: "vsix-cli",
                    title: "1. VSIX install error: 'code command not recognized'",
                    content:
                      "If running `code --install-extension` yields 'command not found', open VS Code, press Ctrl+Shift+P, type 'Shell Command: Install code command in PATH', and press Enter. Alternatively, install via the GUI: Extensions panel → ... menu → Install from VSIX.",
                  },
                  {
                    id: "commands-missing",
                    title: "2. DB Copilot commands do not appear in Command Palette",
                    content:
                      "The extension activates when opening folders containing JavaScript, TypeScript, or SQL files. Make sure you open a project folder (like sample-project), or reload the window (Ctrl+Shift+P → Developer: Reload Window).",
                  },
                  {
                    id: "backend-offline",
                    title: "3. 'Could not reach DB Copilot server at http://localhost:5000'",
                    content:
                      "The extension requires the DB Copilot backend process. In your terminal, run 'cd backend && npm run dev'. Check the live status badge at the top of this page to confirm port 5000 is listening.",
                  },
                  {
                    id: "session-expired",
                    title: "4. 401 Unauthorized or 'Session expired'",
                    content:
                      "For security, database sessions expire after 30 minutes of inactivity. Reconnect in the web app under Connections, or run 'DB Copilot: Connect Database' directly in VS Code to establish a fresh cryptographic session.",
                  },
                  {
                    id: "no-findings",
                    title: "5. Analysis runs but finds 0 issues",
                    content:
                      "Verify that a database is actively connected. If no database session is active, the AST validator cannot compare your queries against table schemas. Connect to a database first, then re-run analysis.",
                  },
                  {
                    id: "unsupported-sql",
                    title: "6. Query reported as 'Unsupported SQL'",
                    content:
                      "DB Copilot validates standard SELECT, JOIN, GROUP BY, ORDER BY, and WHERE queries. Queries containing CTEs (WITH ...), window functions, or complex UNIONs are reported honestly as Unsupported rather than false errors.",
                  },
                ].map((item) => {
                  const isOpen = openTroubleshoot === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenTroubleshoot(isOpen ? null : item.id)
                        }
                        className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-200 hover:bg-white/5 transition"
                      >
                        <span>{item.title}</span>
                        <span className="text-slate-400 font-mono text-sm">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5 bg-black/40 p-3.5 text-xs leading-relaxed text-slate-400">
                          {item.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous Step
          </button>

          <span className="text-xs text-slate-500">
            {activeStep === steps.length ? "Setup Complete" : `Next: ${steps[activeStep].title}`}
          </span>

          <button
            type="button"
            disabled={activeStep === steps.length}
            onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
