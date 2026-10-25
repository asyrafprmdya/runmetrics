import { describe, expect, it } from "vitest";
import {
  calculateHeartRateZones,
  calculateKarvonenTargetHR,
  calculateMaxHeartRate,
  calculatePercentMaxTargetHR,
} from "./heartRate";
import { calculatePace, calculateTrainingPaces, calculateVdot, paceFromVo2 } from "./pace";
import { compareToTarget, predictRaceTime } from "./race";
import { CalculationError } from "./errors";

describe("heart rate", () => {
  it("estimates HRmax with 208 - 0.7 x age", () => {
    expect(calculateMaxHeartRate(30)).toBe(187);
    expect(calculateMaxHeartRate(40)).toBe(180);
  });

  it("rejects invalid ages", () => {
    expect(() => calculateMaxHeartRate(0)).toThrow(CalculationError);
    expect(() => calculateMaxHeartRate(150)).toThrow(CalculationError);
    expect(() => calculateMaxHeartRate(Number.NaN)).toThrow(CalculationError);
    expect(() => calculateMaxHeartRate(-5)).toThrow(CalculationError);
  });

  it("applies Karvonen with effort converted from percent", () => {
    expect(calculateKarvonenTargetHR(60, 190, 70)).toBe(151);
    expect(calculateKarvonenTargetHR(60, 190, 100)).toBe(190);
  });

  it("rejects Karvonen when HRmax is not above RHR or effort is out of range", () => {
    expect(() => calculateKarvonenTargetHR(150, 150, 70)).toThrow(CalculationError);
    expect(() => calculateKarvonenTargetHR(160, 150, 70)).toThrow(CalculationError);
    expect(() => calculateKarvonenTargetHR(60, 190, 0)).toThrow(CalculationError);
    expect(() => calculateKarvonenTargetHR(60, 190, 150)).toThrow(CalculationError);
  });

  it("computes percent of HRmax", () => {
    expect(calculatePercentMaxTargetHR(190, 80)).toBe(152);
  });

  it("builds contiguous zones from HRmax", () => {
    const zones = calculateHeartRateZones({ hrMax: 190, rhr: null, method: "hrmax" });
    expect(zones).toHaveLength(5);
    expect(zones[0].lowBpm).toBe(95);
    expect(zones[4].highBpm).toBe(190);
    for (let i = 0; i < zones.length - 1; i += 1) {
      expect(zones[i].highBpm).toBe(zones[i + 1].lowBpm);
    }
  });

  it("builds Karvonen zones that end at HRmax and start above RHR", () => {
    const zones = calculateHeartRateZones({ hrMax: 190, rhr: 60, method: "karvonen" });
    expect(zones[4].highBpm).toBe(190);
    expect(zones[0].lowBpm).toBe(125);
    expect(zones[0].lowBpm).toBeGreaterThan(60);
  });

  it("requires RHR for Karvonen zones", () => {
    expect(() => calculateHeartRateZones({ hrMax: 190, rhr: null, method: "karvonen" })).toThrow(
      CalculationError,
    );
  });
});

describe("pace", () => {
  it("computes pace in seconds per km", () => {
    expect(calculatePace(5, 1500)).toBe(300);
    expect(calculatePace(10, 3000)).toBe(300);
  });

  it("rejects zero and negative inputs", () => {
    expect(() => calculatePace(0, 1500)).toThrow(CalculationError);
    expect(() => calculatePace(5, 0)).toThrow(CalculationError);
    expect(() => calculatePace(-5, 1500)).toThrow(CalculationError);
    expect(() => calculatePace(5, Number.NaN)).toThrow(CalculationError);
  });

  it("computes a plausible VDOT for a 25:00 5K", () => {
    const vdot = calculateVdot(5, 1500);
    expect(vdot).toBeGreaterThan(37.5);
    expect(vdot).toBeLessThan(39);
  });

  it("rejects unrealistic performances", () => {
    expect(() => calculateVdot(5, 600)).toThrow(CalculationError);
    expect(() => calculateVdot(5, 7200)).toThrow(CalculationError);
  });

  it("inverts the VO2 cost curve", () => {
    const velocity = 200;
    const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
    expect(paceFromVo2(vo2)).toBeCloseTo(300, 6);
  });

  it("orders training paces from slowest to fastest", () => {
    const { paces } = calculateTrainingPaces(5, 1500);
    const sequence = [
      paces.easy.slowSecPerKm,
      paces.easy.fastSecPerKm,
      paces.tempo.slowSecPerKm,
      paces.tempo.fastSecPerKm,
      paces.threshold.slowSecPerKm,
      paces.threshold.fastSecPerKm,
      paces.interval.slowSecPerKm,
      paces.interval.fastSecPerKm,
    ];
    for (let i = 0; i < sequence.length - 1; i += 1) {
      expect(sequence[i]).toBeGreaterThan(sequence[i + 1]);
    }
  });

  it("keeps training paces in a sensible band around the 5K pace", () => {
    const { paces } = calculateTrainingPaces(5, 1500);
    expect(paces.easy.midSecPerKm).toBeGreaterThan(360);
    expect(paces.easy.midSecPerKm).toBeLessThan(450);
    expect(paces.threshold.midSecPerKm).toBeGreaterThan(305);
    expect(paces.threshold.midSecPerKm).toBeLessThan(325);
    expect(paces.interval.midSecPerKm).toBeLessThan(300);
  });

  it("gives faster training paces for a faster test result", () => {
    const slow = calculateTrainingPaces(5, 1800).paces.easy.midSecPerKm;
    const fast = calculateTrainingPaces(5, 1200).paces.easy.midSecPerKm;
    expect(fast).toBeLessThan(slow);
  });
});

describe("race prediction", () => {
  it("applies the Riegel formula", () => {
    const prediction = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 10 });
    expect(prediction.seconds).toBe(Math.round(1500 * Math.pow(2, 1.06)));
    expect(prediction.avgPaceSecPerKm).toBeCloseTo(prediction.seconds / 10, 9);
    expect(prediction.avgPaceSecPerKm).toBeGreaterThan(300);
    expect(prediction.warning).toBeNull();
  });

  it("returns the same time for the same distance", () => {
    const prediction = predictRaceTime({ testDistanceKm: 10, testTimeSeconds: 3000, raceDistanceKm: 10 });
    expect(prediction.seconds).toBe(3000);
  });

  it("changes when the reference changes", () => {
    const base = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 21.0975 });
    const faster = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1400, raceDistanceKm: 21.0975 });
    expect(faster.seconds).toBeLessThan(base.seconds);
  });

  it("predicts longer distances as slower in total and per km", () => {
    const tenK = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 10 });
    const half = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 21.0975 });
    const marathon = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 42.195 });
    expect(half.seconds).toBeGreaterThan(tenK.seconds);
    expect(marathon.seconds).toBeGreaterThan(half.seconds);
    expect(half.avgPaceSecPerKm).toBeGreaterThan(tenK.avgPaceSecPerKm);
    expect(marathon.avgPaceSecPerKm).toBeGreaterThan(half.avgPaceSecPerKm);
  });

  it("warns on large extrapolation", () => {
    const marathon = predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 42.195 });
    expect(marathon.warning).not.toBeNull();
    const shorter = predictRaceTime({ testDistanceKm: 21.0975, testTimeSeconds: 6000, raceDistanceKm: 5 });
    expect(shorter.warning).not.toBeNull();
  });

  it("rejects invalid inputs", () => {
    expect(() => predictRaceTime({ testDistanceKm: 0, testTimeSeconds: 1500, raceDistanceKm: 10 })).toThrow(
      CalculationError,
    );
    expect(() => predictRaceTime({ testDistanceKm: 5, testTimeSeconds: -1, raceDistanceKm: 10 })).toThrow(
      CalculationError,
    );
    expect(() => predictRaceTime({ testDistanceKm: 5, testTimeSeconds: 1500, raceDistanceKm: 0 })).toThrow(
      CalculationError,
    );
  });

  it("compares a prediction to a target", () => {
    expect(compareToTarget(6570, 6600)).toEqual({ differenceSeconds: -30, status: "faster" });
    expect(compareToTarget(6630, 6600)).toEqual({ differenceSeconds: 30, status: "slower" });
    expect(compareToTarget(6600, 6600)).toEqual({ differenceSeconds: 0, status: "on-target" });
  });
});
