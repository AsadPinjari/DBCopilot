"use client";

import React from "react";
import { DbCopilotMark } from "@/components/ui/DbCopilotLogo";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({
  title,
  subtitle,
}: AppHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/30 p-6 shadow-xl shadow-black/30 backdrop-blur-xl">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/15 via-cyan-500/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-300">
            <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Intelligent Database Engine & Code Analyzer</span>
          </div>

          <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            <span>{title || "DB Copilot"}</span>
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            {subtitle ||
              "Inspect live schemas, validate SQL syntax & semantics in your codebase, detect breaking schema drift, and chat with your database copilot."}
          </p>
        </div>

        {/* Brand Feature Badges */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300">
            <DbCopilotMark size={18} />
            <span className="font-semibold text-white">AST Parser</span>
            <span className="text-slate-400">· Non-destructive</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-slate-200">MySQL · Postgres · SQLite · Mongo · Redis</span>
          </div>
        </div>
      </div>
    </header>
  );
}
