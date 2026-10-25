import { EPSILON_KM, LIMITS } from "./constants";
import { CalculationError, assertPositive, assertRange } from "./errors";

export type SplitStrategy = "even" | "negative" | "positive";

export interface SplitOptions {
  distanceKm: number;
  targetSeconds: number;
  strategy: SplitStrategy;
  changePercent: number;
  segmentKm?: number;
  overrides?: Record<string, number>;
  lockTotal?: boolean;
}

export interface SplitRow {
  index: number;
  startKm: number;
  endKm: number;
  lengthKm: number;
  seconds: number;
  paceSecPerKm: number;
  cumulativeSeconds: number;
  paceDeltaSeconds: number | null;
  edited: boolean;
}

export interface SplitPlan {
  rows: SplitRow[];
  totalSeconds: number;
  avgPaceSecPerKm: number;
  targetSeconds: number;
  differenceSeconds: number;
  warnings: string[];
}

interface Segment {
  startKm: number;
  lengthKm: number;
}

const MAX_DISTANCE_KM = 100;
const MAX_SEGMENTS = 200;

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function buildSegments(distanceKm: number, segmentKm: number): Segment[] {
  const segments: Segment[] = [];
  let startKm = 0;
  while (startKm < distanceKm - EPSILON_KM) {
    const lengthKm = Math.min(segmentKm, distanceKm - startKm);
    segments.push({ startKm, lengthKm });
    startKm += lengthKm;
    if (segments.length > MAX_SEGMENTS) {
      throw new CalculationError("Jumlah split terlalu banyak.");
    }
  }
  return segments;
}

export function allocateSeconds(values: number[], total: number): number[] {
  const floors = values.map((value) => Math.floor(value));
  let remainder = total - sum(floors);
  const order = values
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const result = [...floors];
  for (let k = 0; remainder > 0 && k < order.length; k += 1) {
    result[order[k].index] += 1;
    remainder -= 1;
  }
  return result;
}

function normalizeOverrides(
  overrides: Record<string, number> | undefined,
  segmentCount: number,
): Map<number, number> {
  const map = new Map<number, number>();
  if (!overrides) return map;
  for (const [key, value] of Object.entries(overrides)) {
    const index = Number(key);
    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < segmentCount &&
      Number.isFinite(value) &&
      value >= 1
    ) {
      map.set(index, Math.round(value));
    }
  }
  return map;
}

export function generateRaceSplits(options: SplitOptions): SplitPlan {
  const { distanceKm, targetSeconds, strategy, changePercent } = options;
  const segmentKm = options.segmentKm ?? 1;
  const lockTotal = options.lockTotal ?? false;

  assertRange(distanceKm, 0.1, MAX_DISTANCE_KM, "Jarak lomba");
  assertPositive(targetSeconds, "Target waktu");
  assertRange(changePercent, LIMITS.changePercent.min, LIMITS.changePercent.max, "Perubahan pace");
  assertRange(segmentKm, 0.1, MAX_DISTANCE_KM, "Panjang split");

  const target = Math.round(targetSeconds);
  const segments = buildSegments(distanceKm, segmentKm);

  const spread = strategy === "even" ? 0 : changePercent / 100;
  const direction = strategy === "positive" ? 1 : strategy === "negative" ? -1 : 0;

  const weights = segments.map((segment) => {
    const midpoint = segment.startKm + segment.lengthKm / 2;
    const factor = 1 + direction * spread * (midpoint / distanceKm - 0.5);
    return factor * segment.lengthKm;
  });
  const weightSum = sum(weights);
  const base = weights.map((weight) => (weight * target) / weightSum);
  const baseline = allocateSeconds(base, target);

  const overrides = normalizeOverrides(options.overrides, segments.length);
  const warnings: string[] = [];
  let seconds = [...baseline];

  if (overrides.size > 0) {
    const freeIndexes = segments.map((_, index) => index).filter((index) => !overrides.has(index));
    const pinned = sum([...overrides.values()]);

    if (lockTotal && freeIndexes.length === 0) {
      warnings.push("Semua split diedit manual, jadi total mengikuti jumlah split yang kamu isi.");
      seconds = segments.map((_, index) => overrides.get(index) ?? baseline[index]);
    } else if (lockTotal) {
      const remaining = target - pinned;
      if (remaining < freeIndexes.length) {
        warnings.push(
          "Waktu split yang diedit terlalu besar, split lain tidak punya sisa waktu. Total melebihi target.",
        );
      } else {
        const freeBase = freeIndexes.map((index) => base[index]);
        const freeSum = sum(freeBase);
        const scaled = freeBase.map((value) => (value * remaining) / freeSum);
        const allocated = allocateSeconds(scaled, remaining);
        freeIndexes.forEach((index, position) => {
          seconds[index] = allocated[position];
        });
      }
      overrides.forEach((value, index) => {
        seconds[index] = value;
      });
    } else {
      overrides.forEach((value, index) => {
        seconds[index] = value;
      });
    }
  }

  let cumulative = 0;
  let previousRoundedPace: number | null = null;
  const rows: SplitRow[] = segments.map((segment, index) => {
    cumulative += seconds[index];
    const paceSecPerKm = seconds[index] / segment.lengthKm;
    const roundedPace = Math.round(paceSecPerKm);
    const paceDeltaSeconds = previousRoundedPace === null ? null : roundedPace - previousRoundedPace;
    previousRoundedPace = roundedPace;
    return {
      index,
      startKm: segment.startKm,
      endKm: segment.startKm + segment.lengthKm,
      lengthKm: segment.lengthKm,
      seconds: seconds[index],
      paceSecPerKm,
      cumulativeSeconds: cumulative,
      paceDeltaSeconds,
      edited: overrides.has(index),
    };
  });

  const totalSeconds = cumulative;
  return {
    rows,
    totalSeconds,
    avgPaceSecPerKm: totalSeconds / distanceKm,
    targetSeconds: target,
    differenceSeconds: totalSeconds - target,
    warnings,
  };
}

export interface HalfSplits {
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  firstHalfPaceSecPerKm: number;
  secondHalfPaceSecPerKm: number;
}

export function calculateHalfSplits(rows: SplitRow[], distanceKm: number): HalfSplits {
  assertPositive(distanceKm, "Jarak");
  const halfKm = distanceKm / 2;
  let first = 0;
  let second = 0;
  for (const row of rows) {
    if (row.endKm <= halfKm + EPSILON_KM) {
      first += row.seconds;
    } else if (row.startKm >= halfKm - EPSILON_KM) {
      second += row.seconds;
    } else {
      const portion = (halfKm - row.startKm) / row.lengthKm;
      first += row.seconds * portion;
      second += row.seconds * (1 - portion);
    }
  }
  return {
    firstHalfSeconds: first,
    secondHalfSeconds: second,
    firstHalfPaceSecPerKm: first / halfKm,
    secondHalfPaceSecPerKm: second / halfKm,
  };
}
