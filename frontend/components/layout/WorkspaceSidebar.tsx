
"use client";

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
  icon: string;
  description: string;
}[] = [
  {
    id: "chat",
    label: "AI Chat",
    icon: "✳",
    description: "Ask your database copilot",
  },
  {
    id: "schema",
    label: "Schema Explorer",
    icon: "▤",
    description: "Tables and relationships",
  },
  {
    id: "sql",
    label: "SQL Assistant",
    icon: "</>",
    description: "Validate and explain SQL",
  },
  {
    id: "code",
    label: "Code ↔ Database",
    icon: "⌘",
    description: "Analyze your project",
  },
  {
    id: "drift",
    label: "Schema Drift",
    icon: "⇄",
    description: "Compare code and schema",
  },
  {
    id: "ide",
    label: "IDE Integration",
    icon: "◩",
    description: "VS Code extension setup",
  },
  {
    id: "connections",
    label: "Connections",
    icon: "◉",
    description: "Manage database access",
  },
];

export default function WorkspaceSidebar({
  activeView,
  onViewChange,
  isConnected,
}: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-[#0b101c]">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-400/10 text-lg font-bold text-indigo-300">
            D
          </div>

          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white">
              DB Copilot
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Database workspace
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1" aria-label="Workspace navigation">
          {navigation.map((item) => {
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-200"
                    : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] font-mono text-sm">
                  {item.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">
                    {item.description}
                  </span>
                </span>

                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {isConnected ? "Database connected" : "No active connection"}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {isConnected
              ? "Your workspace can access the connected database session."
              : "Connect a database to inspect its schema and analyze queries."}
          </p>

          <button
            type="button"
            onClick={() => onViewChange("connections")}
            className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            {isConnected ? "View connection" : "Connect database"}
          </button>
        </div>

        <p className="px-1 pt-4 text-[10px] text-slate-600">
          DB Copilot · Developer tools
        </p>
      </div>
    </aside>
  );
}

export type { WorkspaceView };
