import { RIEGEL_EXPONENT } from "./constants";
import { assertPositive } from "./errors";

export interface RacePredictionInput {
  testDistanceKm: number;
  testTimeSeconds: number;
  raceDistanceKm: number;
}

export interface RacePrediction {
  seconds: number;
  avgPaceSecPerKm: number;
  distanceRatio: number;
  warning: string | null;
}

export function predictRaceTime({
  testDistanceKm,
  testTimeSeconds,
  raceDistanceKm,
}: RacePredictionInput): RacePrediction {
  assertPositive(testDistanceKm, "Jarak tes");
  assertPositive(testTimeSeconds, "Waktu tes");
  assertPositive(raceDistanceKm, "Jarak lomba");

  const distanceRatio = raceDistanceKm / testDistanceKm;
  const seconds = Math.round(testTimeSeconds * Math.pow(distanceRatio, RIEGEL_EXPONENT));

  let warning: string | null = null;
  if (distanceRatio > 4) {
    warning =
      "Jarak lomba jauh lebih panjang dari jarak tes. Rumus Riegel cenderung terlalu optimis untuk ekstrapolasi sejauh ini, anggap hasilnya batas atas performa.";
  } else if (distanceRatio < 0.5) {
    warning =
      "Jarak lomba jauh lebih pendek dari jarak tes. Prediksi kurang akurat karena kecepatan murni ikut berpengaruh.";
  }

  return {
    seconds,
    avgPaceSecPerKm: seconds / raceDistanceKm,
    distanceRatio,
    warning,
  };
}

export type TargetStatus = "faster" | "slower" | "on-target";

export interface TargetComparison {
  differenceSeconds: number;
  status: TargetStatus;
}

export function compareToTarget(predictedSeconds: number, targetSeconds: number): TargetComparison {
  assertPositive(predictedSeconds, "Prediksi");
  assertPositive(targetSeconds, "Target");
  const differenceSeconds = predictedSeconds - targetSeconds;
  const status: TargetStatus =
    differenceSeconds === 0 ? "on-target" : differenceSeconds < 0 ? "faster" : "slower";
  return { differenceSeconds, status };
}
