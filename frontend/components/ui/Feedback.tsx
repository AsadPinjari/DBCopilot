import React from "react";

type FeedbackProps = {
  type: "success" | "error" | "warning";
  message: string;
  className?: string;
};

const feedbackStyles = {
  success:
    "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  error:
    "border-rose-500/30 bg-rose-950/30 text-rose-200",
  warning:
    "border-amber-500/30 bg-amber-950/30 text-amber-200",
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
      className={`mt-4 flex items-start gap-3 rounded-xl border p-3.5 text-xs md:text-sm font-medium shadow-md backdrop-blur-md ${feedbackStyles[type]} ${className}`}
    >
      <span className="shrink-0 pt-0.5">
        {type === "success" && (
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {type === "error" && (
          <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {type === "warning" && (
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
      </span>
      <div className="flex-1 leading-relaxed">{message}</div>
    </div>
  );
}
