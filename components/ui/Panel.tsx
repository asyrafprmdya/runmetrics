import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Panel({ title, description, action, children, className = "", elevated = false }: PanelProps) {
  return (
    <section
      className={`rounded-xl border border-line p-5 sm:p-6 ${elevated ? "bg-elevated" : "bg-surface"} ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-medium text-ink">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
