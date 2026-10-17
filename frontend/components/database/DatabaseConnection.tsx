
type DatabaseConnectionProps = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  isConnecting: boolean;
  isConnected: boolean;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onDatabaseChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

export default function DatabaseConnection({
  host,
  port,
  username,
  password,
  database,
  isConnecting,
  isConnected,
  onHostChange,
  onPortChange,
  onUsernameChange,
  onPasswordChange,
  onDatabaseChange,
  onConnect,
  onDisconnect,
}: DatabaseConnectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Database Host
          </label>
          <input
            value={host}
            onChange={(event) => onHostChange(event.target.value)}
            placeholder="localhost"
            disabled={isConnecting || isConnected}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(event) => onPortChange(event.target.value)}
            placeholder="3306"
            disabled={isConnecting || isConnected}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Username
          </label>
          <input
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Database username"
            autoComplete="username"
            disabled={isConnecting || isConnected}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Database password"
            autoComplete="current-password"
            disabled={isConnecting || isConnected}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-300">
            Database Name
          </label>
          <input
            value={database}
            onChange={(event) => onDatabaseChange(event.target.value)}
            placeholder="dbcopilot_demo"
            disabled={isConnecting || isConnected}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isConnected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConnecting ? "Connecting..." : "Connect Database"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 font-medium text-red-300 transition hover:bg-red-500/20"
          >
            Disconnect Database
          </button>
        )}
      </div>

      {isConnected && (
        <p className="text-sm text-emerald-400">
          Database connected successfully.
        </p>
      )}
    </div>
  );
}
