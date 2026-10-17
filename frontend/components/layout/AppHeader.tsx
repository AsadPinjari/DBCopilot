
export default function AppHeader() {
  return (
    <header>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
        AI Database Development Assistant
      </p>

      <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
        DBCopilot
      </h1>

      <p className="mt-3 max-w-2xl text-slate-400">
        Connect your database, inspect your schema, analyze project code,
        and understand SQL queries in one place.
      </p>
    </header>
  );
}
