import type { HrMethod } from "@/lib/calculations/heartRate";
import type { SplitStrategy } from "@/lib/calculations/splits";
import type { TargetMode } from "@/lib/types";

export const STRATEGY_LABELS: Record<SplitStrategy, string> = {
  even: "Even split",
  negative: "Negative split",
  positive: "Positive split",
};

export const STRATEGY_HINTS: Record<SplitStrategy, string> = {
  even: "Pace dijaga konstan dari start sampai finish.",
  negative: "Mulai konservatif, paruh kedua lebih cepat.",
  positive: "Mulai lebih cepat, paruh kedua melambat.",
};

export const TARGET_MODE_LABELS: Record<TargetMode, string> = {
  finish: "Waktu finish",
  pace: "Average pace",
  predicted: "Dari prediksi",
};

export const HR_METHOD_LABELS: Record<HrMethod, string> = {
  hrmax: "Persen HRmax",
  karvonen: "Karvonen (HRR)",
};
