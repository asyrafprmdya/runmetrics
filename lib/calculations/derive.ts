import type { AppState, Profile, Reference } from "@/lib/types";
import { DISTANCES } from "./constants";
import { tryCalc } from "./errors";
import {
  calculateHeartRateZones,
  calculateMaxHeartRate,
  type HeartRateZone,
  type HrMethod,
} from "./heartRate";
import { calculatePace, calculateTrainingPaces, type TrainingPaceResult } from "./pace";
import { predictRaceTime, type RacePrediction } from "./race";
import { generateRaceSplits, type SplitPlan } from "./splits";

export function resolveHrMax(profile: Profile): number | null {
  if (profile.hrMaxMode === "manual") return profile.hrMax;
  if (profile.age === null) return null;
  return tryCalc(() => calculateMaxHeartRate(profile.age as number));
}

export interface HeartRateInfo {
  hrMax: number;
  rhr: number | null;
  method: HrMethod;
  zones: HeartRateZone[];
}

export function getHeartRateInfo(profile: Profile): HeartRateInfo | null {
  const hrMax = resolveHrMax(profile);
  if (hrMax === null) return null;
  const zones = tryCalc(() =>
    calculateHeartRateZones({ hrMax, rhr: profile.rhr, method: profile.hrMethod }),
  );
  if (zones === null) return null;
  return { hrMax, rhr: profile.rhr, method: profile.hrMethod, zones };
}

export interface ReferenceMetrics {
  distanceKm: number;
  timeSeconds: number;
  paceSecPerKm: number;
  vdot: number;
  training: TrainingPaceResult;
}

export function getReferenceMetrics(reference: Reference): ReferenceMetrics | null {
  if (reference.timeSeconds === null) return null;
  const distanceKm = DISTANCES[reference.distanceKey].km;
  const timeSeconds = reference.timeSeconds;
  return tryCalc(() => {
    const training = calculateTrainingPaces(distanceKm, timeSeconds);
    return {
      distanceKm,
      timeSeconds,
      paceSecPerKm: calculatePace(distanceKm, timeSeconds),
      vdot: training.vdot,
      training,
    };
  });
}

export interface PredictionResult extends RacePrediction {
  raceDistanceKm: number;
}

export function getPrediction(state: AppState): PredictionResult | null {
  const reference = state.reference;
  if (reference.timeSeconds === null) return null;
  const raceDistanceKm = DISTANCES[state.race.distanceKey].km;
  const prediction = tryCalc(() =>
    predictRaceTime({
      testDistanceKm: DISTANCES[reference.distanceKey].km,
      testTimeSeconds: reference.timeSeconds as number,
      raceDistanceKm,
    }),
  );
  return prediction === null ? null : { ...prediction, raceDistanceKm };
}

export interface SplitTarget {
  seconds: number | null;
  message: string | null;
}

export function resolveSplitTarget(state: AppState): SplitTarget {
  const distanceKm = DISTANCES[state.race.distanceKey].km;
  const { targetMode, targetPaceSeconds } = state.split;

  if (targetMode === "finish") {
    if (state.race.targetSeconds === null) {
      return { seconds: null, message: "Isi target waktu finish untuk membuat rencana split." };
    }
    return { seconds: state.race.targetSeconds, message: null };
  }

  if (targetMode === "pace") {
    if (targetPaceSeconds === null) {
      return { seconds: null, message: "Isi target average pace untuk membuat rencana split." };
    }
    return { seconds: Math.round(targetPaceSeconds * distanceKm), message: null };
  }

  const prediction = getPrediction(state);
  if (prediction === null) {
    return {
      seconds: null,
      message: "Prediksi butuh data tes. Isi dulu hasil tes di Pace Calculator atau Race Predictor.",
    };
  }
  return { seconds: prediction.seconds, message: null };
}

export function buildSplitPlan(state: AppState): SplitPlan | null {
  const target = resolveSplitTarget(state);
  if (target.seconds === null) return null;
  return tryCalc(() =>
    generateRaceSplits({
      distanceKm: DISTANCES[state.race.distanceKey].km,
      targetSeconds: target.seconds as number,
      strategy: state.split.strategy,
      changePercent: state.split.changePercent,
      segmentKm: state.split.segmentKm,
      overrides: state.split.overrides,
      lockTotal: state.split.lockTotal,
    }),
  );
}
