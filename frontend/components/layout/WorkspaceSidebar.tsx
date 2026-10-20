"use client";

import React from "react";
import DbCopilotLogo from "@/components/ui/DbCopilotLogo";

type WorkspaceView =
  | "chat"
  | "schema"
  | "sql"
  | "code"
  | "drift"
  | "ide"
  | "connections";

type WorkspaceSidebarProps = {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  isConnected: boolean;
};

const navigation: {
  id: WorkspaceView;
  label: string;
  badge?: string;
  description: string;
  icon: (active: boolean) => React.ReactNode;
}[] = [
  {
    id: "chat",
    label: "AI Copilot Chat",
    badge: "AI",
    description: "Ask SQL, schema & data questions",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-cyan-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "schema",
    label: "Schema Explorer",
    description: "Tables, columns & foreign keys",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-indigo-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    id: "sql",
    label: "SQL Assistant",
    description: "AST validation & AI explanations",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-sky-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: "code",
    label: "Code ↔ Database",
    description: "Static project scan & queries",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-purple-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "drift",
    label: "Schema Drift",
    description: "Compare code vs live schema",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-emerald-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: "ide",
    label: "IDE Integration",
    badge: "VS Code",
    description: "Extension setup & download",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-blue-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "connections",
    label: "Connections",
    description: "Multi-database adapters & auth",
    icon: (active) => (
      <svg className={`h-4 w-4 ${active ? "text-amber-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
];

export default function WorkspaceSidebar({
  activeView,
  onViewChange,
  isConnected,
}: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-white/[0.08] bg-[#070b14]/90 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="border-b border-white/[0.08] px-5 py-4">
        <DbCopilotLogo size="sm" withText={true} />
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-5">
        <div className="mb-2.5 flex items-center justify-between px-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Workspace Tools
          </p>
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold text-slate-400">
            {navigation.length} modules
          </span>
        </div>

        <nav className="space-y-1" aria-label="Workspace navigation">
          {navigation.map((item) => {
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-transparent text-white shadow-sm ring-1 ring-indigo-500/30"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute -left-3.5 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                )}

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    isActive
                      ? "border-indigo-400/40 bg-indigo-500/20 shadow-inner"
                      : "border-white/[0.06] bg-slate-900/60 group-hover:border-white/15 group-hover:bg-slate-800/60"
                  }`}
                >
                  {item.icon(isActive)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`block text-[13px] font-semibold tracking-tight ${
                        isActive ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Connection Status Card */}
      <div className="mt-auto border-t border-white/[0.08] p-3.5">
        <div
          className={`rounded-xl border p-3 transition-colors ${
            isConnected
              ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-emerald-950/20"
              : "border-white/[0.08] bg-slate-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {isConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    isConnected ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {isConnected ? "Database Active" : "No Database Linked"}
              </span>
            </div>

            <span className="text-[10px] font-mono uppercase text-slate-400">
              {isConnected ? "Ready" : "Idle"}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            {isConnected
              ? "Live schema introspection and query validation active."
              : "Connect MySQL, Postgres, SQLite, Mongo, or Redis to begin."}
          </p>

          <button
            type="button"
            onClick={() => onViewChange("connections")}
            className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 px-3 text-xs font-medium transition ${
              isConnected
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                : "border-indigo-500/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 hover:text-white"
            }`}
          >
            <span>{isConnected ? "Manage Connection" : "Connect Database"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>DB Copilot Studio</span>
          <span className="font-mono">Release RC-1.0</span>
        </div>
      </div>
    </aside>
  );
}

export type { WorkspaceView };
