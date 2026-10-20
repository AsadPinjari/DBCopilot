
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
        rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-6
        ${isChatCard ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}
        ${className.replace("chat-card", "")}
      `}
    >
      <div
        className={`mb-5 shrink-0 ${isChatCard ? "mb-3" : ""}`}
      >
        <h2 className="text-xl font-semibold text-white">
          {step !== undefined ? `${step}. ` : ""}
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-slate-400">
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
