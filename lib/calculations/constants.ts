export type DistanceKey = "5k" | "10k" | "half" | "marathon";
export type TestDistanceKey = "5k" | "10k" | "half";
export type TrainingType = "easy" | "tempo" | "threshold" | "interval";

export const DISTANCES: Record<DistanceKey, { label: string; km: number }> = {
  "5k": { label: "5K", km: 5 },
  "10k": { label: "10K", km: 10 },
  half: { label: "Half marathon", km: 21.0975 },
  marathon: { label: "Marathon", km: 42.195 },
};

export const RACE_DISTANCE_KEYS: DistanceKey[] = ["5k", "10k", "half", "marathon"];
export const TEST_DISTANCE_KEYS: TestDistanceKey[] = ["5k", "10k", "half"];

export const KM_PER_MILE = 1.609344;
export const RIEGEL_EXPONENT = 1.06;
export const EPSILON_KM = 1e-9;

export const LIMITS = {
  age: { min: 10, max: 100 },
  rhr: { min: 30, max: 120 },
  hrMax: { min: 120, max: 230 },
  effort: { min: 40, max: 100 },
  paceSeconds: { min: 120, max: 900 },
  vdot: { min: 15, max: 90 },
  changePercent: { min: 0, max: 20 },
  reps: { min: 1, max: 50 },
  intervalDistanceM: { min: 100, max: 10000 },
  intervalSeconds: { min: 10, max: 3600 },
  recoverySeconds: { min: 0, max: 1800 },
  warmupSeconds: { min: 0, max: 3600 },
  testSeconds: { min: 60, max: 86400 },
} as const;

export interface TrainingTypeInfo {
  label: string;
  description: string;
  vo2Low: number;
  vo2High: number;
  effortLow: number;
  effortHigh: number;
}

export const TRAINING_TYPE_KEYS: TrainingType[] = ["easy", "tempo", "threshold", "interval"];

export const TRAINING_TYPES: Record<TrainingType, TrainingTypeInfo> = {
  easy: {
    label: "Easy",
    description: "Lari santai, bisa ngobrol penuh. Untuk base aerobik dan recovery.",
    vo2Low: 0.6,
    vo2High: 0.72,
    effortLow: 60,
    effortHigh: 70,
  },
  tempo: {
    label: "Tempo",
    description: "Stabil dan terasa cukup berat. Sekitar effort half marathon sampai marathon.",
    vo2Low: 0.8,
    vo2High: 0.85,
    effortLow: 75,
    effortHigh: 82,
  },
  threshold: {
    label: "Threshold",
    description: "Berat tapi terkendali, sekitar batas laktat. Cocok untuk repetisi panjang.",
    vo2Low: 0.86,
    vo2High: 0.89,
    effortLow: 82,
    effortHigh: 88,
  },
  interval: {
    label: "Interval",
    description: "Cepat dan terstruktur dengan recovery. Untuk VO2max, sekitar pace 3K sampai 5K.",
    vo2Low: 0.95,
    vo2High: 0.99,
    effortLow: 90,
    effortHigh: 95,
  },
};

export interface HeartRateZoneDef {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  lowPercent: number;
  highPercent: number;
}

export const HR_ZONE_DEFS: HeartRateZoneDef[] = [
  { zone: 1, name: "Recovery", lowPercent: 50, highPercent: 60 },
  { zone: 2, name: "Easy aerobic", lowPercent: 60, highPercent: 70 },
  { zone: 3, name: "Moderate", lowPercent: 70, highPercent: 80 },
  { zone: 4, name: "Threshold", lowPercent: 80, highPercent: 90 },
  { zone: 5, name: "Maximum", lowPercent: 90, highPercent: 100 },
];
