import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  emphasis?: "primary" | "normal";
  className?: string;
}

export function MetricCard({ label, value, unit, hint, emphasis = "normal", className = "" }: MetricCardProps) {
  const primary = emphasis === "primary";
  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 ${
        primary ? "border-accent/40 bg-elevated" : "border-line bg-surface"
      } ${className}`}
    >
      <p className="text-[13px] text-muted">{label}</p>
      <p
        className={`mt-2 font-semibold leading-none tabular-nums ${
          primary ? "text-[44px] text-accent" : "text-[32px] text-ink"
        }`}
      >
        {value}
        {unit && <span className="ml-1.5 text-sm font-normal text-muted">{unit}</span>}
      </p>
      {hint && <div className="mt-3 text-xs text-muted">{hint}</div>}
    </div>
  );
}
