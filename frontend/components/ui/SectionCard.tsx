import React from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  step?: number;
  children: React.ReactNode;
  className?: string;
};

export default function SectionCard({
  title,
  description,
  step,
  children,
  className = "",
}: SectionCardProps) {
  const isChatCard = className.includes("chat-card");

  return (
    <section
      className={`
        rounded-2xl border border-white/[0.08] bg-slate-900/85 p-5 md:p-6 shadow-xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/[0.04]
        ${isChatCard ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}
        ${className.replace("chat-card", "")}
      `}
    >
      <div className={`mb-5 shrink-0 ${isChatCard ? "mb-3" : ""}`}>
        <div className="flex items-center gap-2.5">
          {step !== undefined && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/20 font-mono text-xs font-bold text-indigo-300">
              {step}
            </span>
          )}
          <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">
            {title}
          </h2>
        </div>

        {description && (
          <p className="mt-1.5 text-xs md:text-sm leading-relaxed text-slate-300">
            {description}
          </p>
        )}
      </div>

      <div
        className={
          isChatCard
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : ""
        }
      >
        {children}
      </div>
    </section>
  );
}
