
type FeedbackProps = {
  type: "success" | "error" | "warning";
  message: string;
  className?: string;
};

const feedbackStyles = {
  success:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  error:
    "border-red-500/20 bg-red-500/10 text-red-300",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-300",
};

export default function Feedback({
  type,
  message,
  className = "",
}: FeedbackProps) {
  if (!message) return null;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`mt-4 rounded-lg border p-3 text-sm ${feedbackStyles[type]} ${className}`}
    >
      {message}
    </div>
  );
}
