import { DISTANCES, LIMITS, type DistanceKey } from "@/lib/calculations/constants";
import { calculateVdot } from "@/lib/calculations/pace";
import { CalculationError } from "@/lib/calculations/errors";
import { calculateMaxHeartRate, type HrMethod } from "@/lib/calculations/heartRate";
import { paceFromUnit, type PaceUnit } from "@/lib/format";
import type { HrMaxMode, Profile } from "@/lib/types";
import { parseDuration, parseNumber, type ParseResult } from "./parse";

export * from "./parse";

export function validateTestTime(
  raw: string,
  distanceKm: number,
): ParseResult<number> {
  const parsed = parseDuration(raw, {
    label: "Waktu tes",
    min: LIMITS.testSeconds.min,
    max: LIMITS.testSeconds.max,
  });
  if (!parsed.ok) return parsed;
  const plausible = isPlausibleTest(distanceKm, parsed.value);
  if (!plausible.ok) return { ok: false, error: plausible.error };
  return parsed;
}

export function isPlausibleTest(distanceKm: number, seconds: number): ParseResult<true> {
  const pace = seconds / distanceKm;
  if (pace < LIMITS.paceSeconds.min || pace > LIMITS.paceSeconds.max) {
    return { ok: false, error: "Pace dari waktu ini tidak masuk akal (harus antara 2:00 dan 15:00 /km)." };
  }
  try {
    calculateVdot(distanceKm, seconds);
  } catch (error) {
    if (error instanceof CalculationError) {
      return { ok: false, error: "Waktu tes tidak realistis untuk jarak ini. Cek lagi angkanya." };
    }
    throw error;
  }
  return { ok: true, value: true };
}

export function validateRaceTarget(raw: string, distanceKey: DistanceKey): ParseResult<number> {
  const parsed = parseDuration(raw, { label: "Target waktu", max: LIMITS.testSeconds.max });
  if (!parsed.ok) return parsed;
  const pace = parsed.value / DISTANCES[distanceKey].km;
  if (pace < LIMITS.paceSeconds.min || pace > LIMITS.paceSeconds.max) {
    return {
      ok: false,
      error: "Pace dari target ini tidak masuk akal (harus antara 2:00 dan 15:00 /km).",
    };
  }
  return parsed;
}

export function validatePaceInput(raw: string, unit: PaceUnit, label: string): ParseResult<number> {
  const parsed = parseDuration(raw, { label, max: 3600 });
  if (!parsed.ok) return parsed;
  const perKm = paceFromUnit(parsed.value, unit);
  if (perKm < LIMITS.paceSeconds.min || perKm > LIMITS.paceSeconds.max) {
    return { ok: false, error: `${label} tidak masuk akal (harus setara 2:00 sampai 15:00 /km).` };
  }
  return { ok: true, value: Math.round(perKm) };
}

export interface ProfileDraft {
  age: string;
  rhr: string;
  hrMaxMode: HrMaxMode;
  hrMax: string;
  hrMethod: HrMethod;
}

export interface ProfileErrors {
  age?: string;
  rhr?: string;
  hrMax?: string;
}

export interface ProfileValidation {
  errors: ProfileErrors;
  profile: Profile | null;
}

export function validateProfileDraft(draft: ProfileDraft): ProfileValidation {
  const errors: ProfileErrors = {};

  const needsAge = draft.hrMaxMode === "estimate";
  const ageText = draft.age.trim();
  let age: number | null = null;
  if (ageText !== "" || needsAge) {
    const parsed = parseNumber(draft.age, { label: "Umur", ...LIMITS.age, integer: true });
    if (parsed.ok) age = parsed.value;
    else errors.age = parsed.error;
  }

  const needsRhr = draft.hrMethod === "karvonen";
  const rhrText = draft.rhr.trim();
  let rhr: number | null = null;
  if (rhrText !== "" || needsRhr) {
    const parsed = parseNumber(draft.rhr, { label: "RHR", ...LIMITS.rhr, integer: true });
    if (parsed.ok) rhr = parsed.value;
    else errors.rhr = needsRhr && rhrText === "" ? "RHR wajib diisi untuk metode Karvonen." : parsed.error;
  }

  let hrMax: number | null = null;
  if (draft.hrMaxMode === "manual") {
    const parsed = parseNumber(draft.hrMax, { label: "HRmax", ...LIMITS.hrMax, integer: true });
    if (parsed.ok) hrMax = parsed.value;
    else errors.hrMax = parsed.error;
  }

  const effectiveHrMax =
    draft.hrMaxMode === "manual" ? hrMax : age === null ? null : calculateMaxHeartRate(age);

  if (effectiveHrMax !== null && rhr !== null && effectiveHrMax <= rhr) {
    errors.rhr = `RHR harus lebih kecil dari HRmax (${effectiveHrMax} bpm).`;
  }

  if (errors.age || errors.rhr || errors.hrMax) return { errors, profile: null };

  return {
    errors,
    profile: {
      age,
      rhr,
      hrMax: draft.hrMaxMode === "manual" ? hrMax : null,
      hrMaxMode: draft.hrMaxMode,
      hrMethod: draft.hrMethod,
    },
  };
}

export function validateEffort(raw: string): ParseResult<number> {
  return parseNumber(raw, { label: "Target effort", min: LIMITS.effort.min, max: LIMITS.effort.max });
}

export function validateChangePercent(raw: string): ParseResult<number> {
  return parseNumber(raw, {
    label: "Perubahan pace",
    min: LIMITS.changePercent.min,
    max: LIMITS.changePercent.max,
  });
}
