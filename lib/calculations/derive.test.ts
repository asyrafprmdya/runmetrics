import { describe, expect, it } from "vitest";
import { DEFAULT_STATE } from "@/lib/defaults";
import type { AppState } from "@/lib/types";
import {
  buildSplitPlan,
  getHeartRateInfo,
  getPrediction,
  getReferenceMetrics,
  resolveHrMax,
  resolveSplitTarget,
} from "./derive";

function withState(patch: Partial<AppState>): AppState {
  return { ...DEFAULT_STATE, ...patch };
}

describe("HR derivation", () => {
  it("resolves estimated and manual HRmax", () => {
    expect(resolveHrMax({ ...DEFAULT_STATE.profile, age: 30 })).toBe(187);
    expect(resolveHrMax({ ...DEFAULT_STATE.profile, age: null })).toBeNull();
    expect(resolveHrMax({ ...DEFAULT_STATE.profile, hrMaxMode: "manual", hrMax: 192 })).toBe(192);
    expect(resolveHrMax({ ...DEFAULT_STATE.profile, hrMaxMode: "manual", hrMax: null })).toBeNull();
  });

  it("returns null when Karvonen has no RHR", () => {
    expect(getHeartRateInfo({ ...DEFAULT_STATE.profile, age: 30, hrMethod: "karvonen", rhr: null })).toBeNull();
    const info = getHeartRateInfo({ ...DEFAULT_STATE.profile, age: 30, hrMethod: "karvonen", rhr: 55 });
    expect(info?.zones).toHaveLength(5);
  });
});

describe("reference and prediction", () => {
  const state = withState({
    reference: { distanceKey: "5k", timeSeconds: 1500, testDate: "" },
    race: { distanceKey: "half", targetSeconds: null },
  });

  it("derives nothing without reference data", () => {
    expect(getReferenceMetrics(DEFAULT_STATE.reference)).toBeNull();
    expect(getPrediction(DEFAULT_STATE)).toBeNull();
  });

  it("derives reference pace and prediction, and updates when the reference changes", () => {
    expect(getReferenceMetrics(state.reference)?.paceSecPerKm).toBe(300);
    const prediction = getPrediction(state);
    expect(prediction?.raceDistanceKm).toBeCloseTo(21.0975, 9);
    const faster = getPrediction({ ...state, reference: { ...state.reference, timeSeconds: 1400 } });
    expect(faster!.seconds).toBeLessThan(prediction!.seconds);
  });
});

describe("split target", () => {
  const reference = { distanceKey: "5k" as const, timeSeconds: 1500, testDate: "" };

  it("explains what is missing for each mode", () => {
    expect(resolveSplitTarget(DEFAULT_STATE).seconds).toBeNull();
    expect(resolveSplitTarget(withState({ split: { ...DEFAULT_STATE.split, targetMode: "pace" } })).seconds).toBeNull();
    expect(
      resolveSplitTarget(withState({ split: { ...DEFAULT_STATE.split, targetMode: "predicted" } })).seconds,
    ).toBeNull();
  });

  it("resolves finish, pace and predicted targets", () => {
    const race = { distanceKey: "10k" as const, targetSeconds: 3000 };
    expect(resolveSplitTarget(withState({ race })).seconds).toBe(3000);
    expect(
      resolveSplitTarget(
        withState({ race, split: { ...DEFAULT_STATE.split, targetMode: "pace", targetPaceSeconds: 295 } }),
      ).seconds,
    ).toBe(2950);
    const predicted = resolveSplitTarget(
      withState({ race, reference, split: { ...DEFAULT_STATE.split, targetMode: "predicted" } }),
    );
    expect(predicted.seconds).toBe(Math.round(1500 * Math.pow(2, 1.06)));
  });

  it("builds a plan that sums to the target, or null without one", () => {
    expect(buildSplitPlan(DEFAULT_STATE)).toBeNull();
    const plan = buildSplitPlan(
      withState({
        race: { distanceKey: "half", targetSeconds: 6600 },
        split: { ...DEFAULT_STATE.split, strategy: "negative", changePercent: 4 },
      }),
    );
    expect(plan?.totalSeconds).toBe(6600);
    expect(plan?.rows).toHaveLength(22);
  });
});
