import { LIMITS } from "./constants";
import { CalculationError, assertRange } from "./errors";

export type IntervalKind = "distance" | "time";

export interface WorkoutInput {
  warmupSeconds: number;
  coolDownSeconds: number;
  reps: number;
  kind: IntervalKind;
  intervalDistanceM: number;
  intervalSeconds: number;
  paceSecPerKm: number | null;
  recoverySeconds: number;
}

export type WorkoutSegmentType = "warmup" | "work" | "recovery" | "cooldown";

export interface WorkoutSegment {
  type: WorkoutSegmentType;
  label: string;
  seconds: number;
  startSeconds: number;
  endSeconds: number;
  distanceM: number | null;
}

export interface WorkoutPlan {
  segments: WorkoutSegment[];
  totalSeconds: number;
  warmupSeconds: number;
  coolDownSeconds: number;
  workSeconds: number;
  recoverySeconds: number;
  workDistanceM: number | null;
}

export function calculateWorkoutDuration(input: WorkoutInput): WorkoutPlan {
  const { reps, kind, paceSecPerKm } = input;

  assertRange(reps, LIMITS.reps.min, LIMITS.reps.max, "Jumlah repetisi");
  if (!Number.isInteger(reps)) {
    throw new CalculationError("Jumlah repetisi harus bilangan bulat.");
  }
  assertRange(input.recoverySeconds, LIMITS.recoverySeconds.min, LIMITS.recoverySeconds.max, "Recovery");
  assertRange(input.warmupSeconds, LIMITS.warmupSeconds.min, LIMITS.warmupSeconds.max, "Warm-up");
  assertRange(input.coolDownSeconds, LIMITS.warmupSeconds.min, LIMITS.warmupSeconds.max, "Cool-down");

  if (paceSecPerKm !== null) {
    assertRange(paceSecPerKm, LIMITS.paceSeconds.min, LIMITS.paceSeconds.max, "Target pace");
  }

  let workSecondsPerRep: number;
  let distancePerRepM: number | null;

  if (kind === "distance") {
    assertRange(
      input.intervalDistanceM,
      LIMITS.intervalDistanceM.min,
      LIMITS.intervalDistanceM.max,
      "Jarak interval",
    );
    if (paceSecPerKm === null) {
      throw new CalculationError("Interval berbasis jarak membutuhkan target pace.");
    }
    workSecondsPerRep = Math.round((input.intervalDistanceM / 1000) * paceSecPerKm);
    distancePerRepM = input.intervalDistanceM;
  } else {
    assertRange(
      input.intervalSeconds,
      LIMITS.intervalSeconds.min,
      LIMITS.intervalSeconds.max,
      "Durasi interval",
    );
    workSecondsPerRep = Math.round(input.intervalSeconds);
    distancePerRepM =
      paceSecPerKm === null ? null : Math.round((input.intervalSeconds / paceSecPerKm) * 1000);
  }

  const segments: WorkoutSegment[] = [];
  let clock = 0;

  const push = (
    type: WorkoutSegmentType,
    label: string,
    seconds: number,
    distanceM: number | null,
  ): void => {
    segments.push({
      type,
      label,
      seconds,
      startSeconds: clock,
      endSeconds: clock + seconds,
      distanceM,
    });
    clock += seconds;
  };

  if (input.warmupSeconds > 0) push("warmup", "Warm-up", Math.round(input.warmupSeconds), null);
  for (let rep = 1; rep <= reps; rep += 1) {
    push("work", `Interval ${rep}`, workSecondsPerRep, distancePerRepM);
    if (rep < reps && input.recoverySeconds > 0) {
      push("recovery", `Recovery ${rep}`, Math.round(input.recoverySeconds), null);
    }
  }
  if (input.coolDownSeconds > 0) push("cooldown", "Cool-down", Math.round(input.coolDownSeconds), null);

  const workSeconds = workSecondsPerRep * reps;
  const recoveryCount = input.recoverySeconds > 0 ? reps - 1 : 0;

  return {
    segments,
    totalSeconds: clock,
    warmupSeconds: Math.round(input.warmupSeconds),
    coolDownSeconds: Math.round(input.coolDownSeconds),
    workSeconds,
    recoverySeconds: Math.round(input.recoverySeconds) * recoveryCount,
    workDistanceM: distancePerRepM === null ? null : distancePerRepM * reps,
  };
}
