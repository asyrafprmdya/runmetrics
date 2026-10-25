import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "warn" | "error";

const TONES: Record<Tone, { icon: typeof Info; color: string; label: string }> = {
  info: { icon: Info, color: "text-muted", label: "Info" },
  warn: { icon: TriangleAlert, color: "text-warn", label: "Perhatian" },
  error: { icon: CircleAlert, color: "text-bad", label: "Masalah" },
};

interface NoticeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function Notice({ tone = "info", children, className = "" }: NoticeProps) {
  const { icon: Icon, color, label } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "note"}
      className={`flex items-start gap-3 rounded-lg border border-line bg-bg p-3 text-xs text-muted ${className}`}
    >
      <Icon size={16} className={`mt-px shrink-0 ${color}`} aria-hidden="true" />
      <div>
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}
