import { LIMITS, TRAINING_TYPES, TRAINING_TYPE_KEYS, type TrainingType } from "./constants";
import { CalculationError, assertPositive } from "./errors";

const VO2_A = -4.6;
const VO2_B = 0.182258;
const VO2_C = 0.000104;

export function calculatePace(distanceKm: number, timeSeconds: number): number {
  assertPositive(distanceKm, "Jarak");
  assertPositive(timeSeconds, "Waktu");
  return timeSeconds / distanceKm;
}

export function calculateVdot(distanceKm: number, timeSeconds: number): number {
  assertPositive(distanceKm, "Jarak");
  assertPositive(timeSeconds, "Waktu");
  const minutes = timeSeconds / 60;
  const velocity = (distanceKm * 1000) / minutes;
  const vo2 = VO2_A + VO2_B * velocity + VO2_C * velocity * velocity;
  const fraction =
    0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
  const vdot = vo2 / fraction;
  if (!Number.isFinite(vdot) || vdot < LIMITS.vdot.min || vdot > LIMITS.vdot.max) {
    throw new CalculationError("Waktu tes tidak realistis untuk jarak tersebut.");
  }
  return vdot;
}

export function paceFromVo2(vo2: number): number {
  const discriminant = VO2_B * VO2_B - 4 * VO2_C * (VO2_A - vo2);
  if (!Number.isFinite(discriminant) || discriminant <= 0) {
    throw new CalculationError("Nilai VO2 tidak valid untuk estimasi pace.");
  }
  const velocity = (-VO2_B + Math.sqrt(discriminant)) / (2 * VO2_C);
  if (!Number.isFinite(velocity) || velocity <= 0) {
    throw new CalculationError("Nilai VO2 tidak valid untuk estimasi pace.");
  }
  return 60000 / velocity;
}

export interface TrainingPaceRange {
  type: TrainingType;
  fastSecPerKm: number;
  slowSecPerKm: number;
  midSecPerKm: number;
}

export interface TrainingPaceResult {
  vdot: number;
  paces: Record<TrainingType, TrainingPaceRange>;
}

export function calculateTrainingPaces(distanceKm: number, timeSeconds: number): TrainingPaceResult {
  const vdot = calculateVdot(distanceKm, timeSeconds);
  const paces = {} as Record<TrainingType, TrainingPaceRange>;
  for (const type of TRAINING_TYPE_KEYS) {
    const info = TRAINING_TYPES[type];
    paces[type] = {
      type,
      fastSecPerKm: paceFromVo2(vdot * info.vo2High),
      slowSecPerKm: paceFromVo2(vdot * info.vo2Low),
      midSecPerKm: paceFromVo2(vdot * ((info.vo2Low + info.vo2High) / 2)),
    };
  }
  return { vdot, paces };
}
