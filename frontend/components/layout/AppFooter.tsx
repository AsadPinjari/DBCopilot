import React from "react";
import { DbCopilotMark } from "@/components/ui/DbCopilotLogo";

export default function AppFooter() {
  return (
    <footer className="mt-12 border-t border-white/[0.08] pt-6 pb-8 text-center">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <DbCopilotMark size={20} />
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            DB Copilot Studio
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-400">
            v1.0.0
          </span>
        </div>

        <p className="max-w-md text-xs leading-relaxed text-slate-400">
          Intelligent database schema introspection, static SQL compatibility analysis, and AI developer tools.
        </p>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Non-destructive static AST inspection</span>
          <span>·</span>
          <span>Local memory sessions</span>
          <span>·</span>
          <span>Zero telemetry</span>
        </div>
      </div>
    </footer>
  );
}
