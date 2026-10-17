
type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export default function LoadingSpinner({
  label = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      className={`flex items-center gap-3 text-sm text-slate-400 ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400"
      />

      <span>{label}</span>
    </div>
  );
}
