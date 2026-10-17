
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
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-6 ${className}`}
    >
      <div className="mb-5">
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

      {children}
    </section>
  );
}
