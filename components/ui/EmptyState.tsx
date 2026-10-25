import type { ReactNode } from "react";
import { ButtonLink } from "./Button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ icon, title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-line bg-surface p-6 sm:p-8">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-elevated text-muted">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <ButtonLink href={actionHref} variant="primary">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  );
}

export function LoadingPanel({ label = "Memuat data lokal" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-line bg-surface p-6 text-sm text-muted"
    >
      {label}...
    </div>
  );
}
