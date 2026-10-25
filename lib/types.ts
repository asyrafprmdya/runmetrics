import type { DistanceKey, TestDistanceKey, TrainingType } from "@/lib/calculations/constants";
import type { HrMethod } from "@/lib/calculations/heartRate";
import type { SplitStrategy } from "@/lib/calculations/splits";
import type { IntervalKind } from "@/lib/calculations/workout";
import type { PaceUnit } from "@/lib/format";

export type HrMaxMode = "estimate" | "manual";
export type TargetMode = "finish" | "pace" | "predicted";
export type PaceMode = "reference" | "manual";
export type SegmentLength = 1 | 2 | 5;

export interface Profile {
  age: number | null;
  rhr: number | null;
  hrMax: number | null;
  hrMaxMode: HrMaxMode;
  hrMethod: HrMethod;
}

export interface Reference {
  distanceKey: TestDistanceKey;
  timeSeconds: number | null;
  testDate: string;
}

export interface RaceSettings {
  distanceKey: DistanceKey;
  targetSeconds: number | null;
}

export interface SplitSettings {
  strategy: SplitStrategy;
  changePercent: number;
  targetMode: TargetMode;
  targetPaceSeconds: number | null;
  segmentKm: SegmentLength;
  lockTotal: boolean;
  overrides: Record<string, number>;
}

export interface IntervalSettings {
  kind: IntervalKind;
  reps: number;
  distanceM: number;
  durationSeconds: number;
  paceMode: PaceMode;
  paceSeconds: number | null;
  recoverySeconds: number;
  warmupSeconds: number;
  coolDownSeconds: number;
}

export interface CalculatorSettings {
  trainingType: TrainingType;
  effortPercent: number;
}

export interface Preferences {
  paceUnit: PaceUnit;
}

export interface AppState {
  version: 1;
  profile: Profile;
  reference: Reference;
  race: RaceSettings;
  split: SplitSettings;
  interval: IntervalSettings;
  calculator: CalculatorSettings;
  preferences: Preferences;
}
