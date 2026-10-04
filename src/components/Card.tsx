export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[var(--radius)] border border-line bg-card p-5 ${className}`}>{children}</section>;
}

export function EmptyState({ icon, title, hint, children }: { icon: string; title: string; hint: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="material-symbols-rounded text-brand" style={{ fontSize: 40 }} aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-md text-muted">{hint}</p>
      {children}
    </div>
  );
}
