import { HR_ZONE_DEFS, LIMITS } from "./constants";
import { CalculationError, assertRange } from "./errors";

export type HrMethod = "hrmax" | "karvonen";

export interface HeartRateZone {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  lowPercent: number;
  highPercent: number;
  lowBpm: number;
  highBpm: number;
}

function assertHeartRatePair(hrMax: number, rhr: number): void {
  assertRange(hrMax, LIMITS.hrMax.min, LIMITS.hrMax.max, "HRmax");
  assertRange(rhr, LIMITS.rhr.min, LIMITS.rhr.max, "RHR");
  if (hrMax <= rhr) {
    throw new CalculationError("HRmax harus lebih besar dari RHR.");
  }
}

export function calculateMaxHeartRate(age: number): number {
  assertRange(age, LIMITS.age.min, LIMITS.age.max, "Umur");
  return Math.round(208 - 0.7 * age);
}

export function calculateKarvonenTargetHR(rhr: number, hrMax: number, effortPercent: number): number {
  assertHeartRatePair(hrMax, rhr);
  assertRange(effortPercent, 1, 100, "Effort");
  const effort = effortPercent / 100;
  return Math.round(rhr + effort * (hrMax - rhr));
}

export function calculatePercentMaxTargetHR(hrMax: number, effortPercent: number): number {
  assertRange(hrMax, LIMITS.hrMax.min, LIMITS.hrMax.max, "HRmax");
  assertRange(effortPercent, 1, 100, "Effort");
  return Math.round(hrMax * (effortPercent / 100));
}

export interface TargetHrInput {
  hrMax: number;
  rhr: number | null;
  method: HrMethod;
  effortPercent: number;
}

export function calculateTargetHR({ hrMax, rhr, method, effortPercent }: TargetHrInput): number {
  if (method === "karvonen") {
    if (rhr === null) throw new CalculationError("Metode Karvonen membutuhkan RHR.");
    return calculateKarvonenTargetHR(rhr, hrMax, effortPercent);
  }
  return calculatePercentMaxTargetHR(hrMax, effortPercent);
}

export interface HeartRateZonesInput {
  hrMax: number;
  rhr: number | null;
  method: HrMethod;
}

export function calculateHeartRateZones({ hrMax, rhr, method }: HeartRateZonesInput): HeartRateZone[] {
  return HR_ZONE_DEFS.map((def) => ({
    zone: def.zone,
    name: def.name,
    lowPercent: def.lowPercent,
    highPercent: def.highPercent,
    lowBpm: calculateTargetHR({ hrMax, rhr, method, effortPercent: def.lowPercent }),
    highBpm: calculateTargetHR({ hrMax, rhr, method, effortPercent: def.highPercent }),
  }));
}
