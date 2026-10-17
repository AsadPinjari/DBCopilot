
type ProjectAnalyzerProps = {
  selectedFile: File | null;
  isAnalyzing: boolean;
  isConnected: boolean;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
};

export default function ProjectAnalyzer({
  selectedFile,
  isAnalyzing,
  isConnected,
  onFileChange,
  onAnalyze,
}: ProjectAnalyzerProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="project-zip"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Upload Project ZIP
        </label>

        <input
          id="project-zip"
          type="file"
          accept=".zip,application/zip"
          onChange={(event) =>
            onFileChange(event.target.files?.[0] ?? null)
          }
          disabled={!isConnected || isAnalyzing}
          className="block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {selectedFile && (
        <p className="text-sm text-slate-400">
          Selected file:{" "}
          <span className="font-medium text-slate-200">
            {selectedFile.name}
          </span>
        </p>
      )}

      {!isConnected && (
        <p className="text-sm text-amber-300">
          Connect your database before analyzing a project.
        </p>
      )}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={!isConnected || !selectedFile || isAnalyzing}
        className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAnalyzing ? "Analyzing Project..." : "Analyze Project"}
      </button>
    </div>
  );
}
