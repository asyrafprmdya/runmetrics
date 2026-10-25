import { DISTANCES, LIMITS, RACE_DISTANCE_KEYS, TEST_DISTANCE_KEYS, TRAINING_TYPE_KEYS } from "@/lib/calculations/constants";
import type { DistanceKey, TestDistanceKey, TrainingType } from "@/lib/calculations/constants";
import type { SplitStrategy } from "@/lib/calculations/splits";
import { DEFAULT_STATE } from "@/lib/defaults";
import type { AppState, PaceMode, SegmentLength, TargetMode } from "@/lib/types";
import { isPlausibleTest } from "@/lib/validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberIn(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function integerIn(value: unknown, min: number, max: number): number | null {
  const result = numberIn(value, min, max);
  return result !== null && Number.isInteger(result) ? result : null;
}

function oneOf<T extends string | number>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function plausiblePace(seconds: number | null, distanceKm: number): number | null {
  if (seconds === null) return null;
  const pace = seconds / distanceKm;
  return pace >= LIMITS.paceSeconds.min && pace <= LIMITS.paceSeconds.max ? seconds : null;
}

export function sanitizeState(raw: unknown): AppState {
  if (!isRecord(raw) || raw.version !== 1) return DEFAULT_STATE;

  const d = DEFAULT_STATE;
  const profileRaw = isRecord(raw.profile) ? raw.profile : {};
  const referenceRaw = isRecord(raw.reference) ? raw.reference : {};
  const raceRaw = isRecord(raw.race) ? raw.race : {};
  const splitRaw = isRecord(raw.split) ? raw.split : {};
  const intervalRaw = isRecord(raw.interval) ? raw.interval : {};
  const calculatorRaw = isRecord(raw.calculator) ? raw.calculator : {};
  const preferencesRaw = isRecord(raw.preferences) ? raw.preferences : {};

  const referenceKey = oneOf<TestDistanceKey>(referenceRaw.distanceKey, TEST_DISTANCE_KEYS, d.reference.distanceKey);
  let referenceSeconds = integerIn(referenceRaw.timeSeconds, LIMITS.testSeconds.min, LIMITS.testSeconds.max);
  if (referenceSeconds !== null && !isPlausibleTest(DISTANCES[referenceKey].km, referenceSeconds).ok) {
    referenceSeconds = null;
  }
  const testDate =
    typeof referenceRaw.testDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(referenceRaw.testDate)
      ? referenceRaw.testDate
      : "";

  const raceKey = oneOf<DistanceKey>(raceRaw.distanceKey, RACE_DISTANCE_KEYS, d.race.distanceKey);
  const raceTarget = plausiblePace(
    integerIn(raceRaw.targetSeconds, 1, LIMITS.testSeconds.max),
    DISTANCES[raceKey].km,
  );

  const overrides: Record<string, number> = {};
  if (isRecord(splitRaw.overrides)) {
    for (const [key, value] of Object.entries(splitRaw.overrides)) {
      const index = Number(key);
      const seconds = integerIn(value, 1, LIMITS.testSeconds.max);
      if (Number.isInteger(index) && index >= 0 && index < 200 && seconds !== null) {
        overrides[String(index)] = seconds;
      }
    }
  }

  const hrMaxMode = oneOf(profileRaw.hrMaxMode, ["estimate", "manual"] as const, d.profile.hrMaxMode);

  return {
    version: 1,
    profile: {
      age: integerIn(profileRaw.age, LIMITS.age.min, LIMITS.age.max),
      rhr: integerIn(profileRaw.rhr, LIMITS.rhr.min, LIMITS.rhr.max),
      hrMax: integerIn(profileRaw.hrMax, LIMITS.hrMax.min, LIMITS.hrMax.max),
      hrMaxMode,
      hrMethod: oneOf(profileRaw.hrMethod, ["hrmax", "karvonen"] as const, d.profile.hrMethod),
    },
    reference: {
      distanceKey: referenceKey,
      timeSeconds: referenceSeconds,
      testDate,
    },
    race: {
      distanceKey: raceKey,
      targetSeconds: raceTarget,
    },
    split: {
      strategy: oneOf<SplitStrategy>(splitRaw.strategy, ["even", "negative", "positive"], d.split.strategy),
      changePercent:
        numberIn(splitRaw.changePercent, LIMITS.changePercent.min, LIMITS.changePercent.max) ??
        d.split.changePercent,
      targetMode: oneOf<TargetMode>(splitRaw.targetMode, ["finish", "pace", "predicted"], d.split.targetMode),
      targetPaceSeconds: integerIn(splitRaw.targetPaceSeconds, LIMITS.paceSeconds.min, LIMITS.paceSeconds.max),
      segmentKm: oneOf<SegmentLength>(splitRaw.segmentKm as SegmentLength, [1, 2, 5], d.split.segmentKm),
      lockTotal: typeof splitRaw.lockTotal === "boolean" ? splitRaw.lockTotal : d.split.lockTotal,
      overrides,
    },
    interval: {
      kind: oneOf(intervalRaw.kind, ["distance", "time"] as const, d.interval.kind),
      reps: integerIn(intervalRaw.reps, LIMITS.reps.min, LIMITS.reps.max) ?? d.interval.reps,
      distanceM:
        integerIn(intervalRaw.distanceM, LIMITS.intervalDistanceM.min, LIMITS.intervalDistanceM.max) ??
        d.interval.distanceM,
      durationSeconds:
        integerIn(intervalRaw.durationSeconds, LIMITS.intervalSeconds.min, LIMITS.intervalSeconds.max) ??
        d.interval.durationSeconds,
      paceMode: oneOf<PaceMode>(intervalRaw.paceMode, ["reference", "manual"], d.interval.paceMode),
      paceSeconds: integerIn(intervalRaw.paceSeconds, LIMITS.paceSeconds.min, LIMITS.paceSeconds.max),
      recoverySeconds:
        integerIn(intervalRaw.recoverySeconds, LIMITS.recoverySeconds.min, LIMITS.recoverySeconds.max) ??
        d.interval.recoverySeconds,
      warmupSeconds:
        integerIn(intervalRaw.warmupSeconds, LIMITS.warmupSeconds.min, LIMITS.warmupSeconds.max) ??
        d.interval.warmupSeconds,
      coolDownSeconds:
        integerIn(intervalRaw.coolDownSeconds, LIMITS.warmupSeconds.min, LIMITS.warmupSeconds.max) ??
        d.interval.coolDownSeconds,
    },
    calculator: {
      trainingType: oneOf<TrainingType>(calculatorRaw.trainingType, TRAINING_TYPE_KEYS, d.calculator.trainingType),
      effortPercent:
        numberIn(calculatorRaw.effortPercent, LIMITS.effort.min, LIMITS.effort.max) ??
        d.calculator.effortPercent,
    },
    preferences: {
      paceUnit: oneOf(preferencesRaw.paceUnit, ["km", "mi"] as const, d.preferences.paceUnit),
    },
  };
}
