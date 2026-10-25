import { TRAINING_TYPES, type TrainingType } from "@/lib/calculations/constants";

export function TrainingTypeBadge({ type }: { type: TrainingType }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-elevated px-2 py-0.5 text-xs font-medium text-ink">
      {TRAINING_TYPES[type].label}
    </span>
  );
}
