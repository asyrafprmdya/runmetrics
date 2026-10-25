import { describe, expect, it } from "vitest";
import { CalculationError } from "./errors";
import { calculateWorkoutDuration, type WorkoutInput } from "./workout";

const base: WorkoutInput = {
  warmupSeconds: 600,
  coolDownSeconds: 600,
  reps: 5,
  kind: "distance",
  intervalDistanceM: 800,
  intervalSeconds: 180,
  paceSecPerKm: 240,
  recoverySeconds: 120,
};

describe("workout duration", () => {
  it("totals a 5 x 800 m session", () => {
    const plan = calculateWorkoutDuration(base);
    expect(plan.workSeconds).toBe(960);
    expect(plan.recoverySeconds).toBe(480);
    expect(plan.totalSeconds).toBe(600 + 960 + 480 + 600);
    expect(plan.workDistanceM).toBe(4000);
    expect(plan.segments[plan.segments.length - 1].endSeconds).toBe(plan.totalSeconds);
  });

  it("orders segments warm-up, work and recovery alternating, cool-down", () => {
    const plan = calculateWorkoutDuration(base);
    expect(plan.segments.map((s) => s.type)).toEqual([
      "warmup",
      "work",
      "recovery",
      "work",
      "recovery",
      "work",
      "recovery",
      "work",
      "recovery",
      "work",
      "cooldown",
    ]);
    for (let i = 1; i < plan.segments.length; i += 1) {
      expect(plan.segments[i].startSeconds).toBe(plan.segments[i - 1].endSeconds);
    }
  });

  it("has no recovery for a single repetition", () => {
    const plan = calculateWorkoutDuration({ ...base, reps: 1 });
    expect(plan.recoverySeconds).toBe(0);
    expect(plan.segments.some((s) => s.type === "recovery")).toBe(false);
  });

  it("skips recovery segments when recovery is zero", () => {
    const plan = calculateWorkoutDuration({ ...base, recoverySeconds: 0 });
    expect(plan.recoverySeconds).toBe(0);
    expect(plan.segments.some((s) => s.type === "recovery")).toBe(false);
  });

  it("skips warm-up and cool-down when zero", () => {
    const plan = calculateWorkoutDuration({ ...base, warmupSeconds: 0, coolDownSeconds: 0 });
    expect(plan.segments[0].type).toBe("work");
    expect(plan.segments[plan.segments.length - 1].type).toBe("work");
  });

  it("supports time-based intervals without a pace", () => {
    const plan = calculateWorkoutDuration({ ...base, kind: "time", reps: 6, paceSecPerKm: null, recoverySeconds: 90 });
    expect(plan.workSeconds).toBe(1080);
    expect(plan.recoverySeconds).toBe(450);
    expect(plan.workDistanceM).toBeNull();
  });

  it("estimates distance for time-based intervals when a pace is given", () => {
    const plan = calculateWorkoutDuration({ ...base, kind: "time", paceSecPerKm: 300 });
    const work = plan.segments.find((s) => s.type === "work");
    expect(work?.distanceM).toBe(600);
  });

  it("rejects bad inputs", () => {
    expect(() => calculateWorkoutDuration({ ...base, kind: "distance", paceSecPerKm: null })).toThrow(
      CalculationError,
    );
    expect(() => calculateWorkoutDuration({ ...base, reps: 0 })).toThrow(CalculationError);
    expect(() => calculateWorkoutDuration({ ...base, reps: 2.5 })).toThrow(CalculationError);
    expect(() => calculateWorkoutDuration({ ...base, reps: 51 })).toThrow(CalculationError);
    expect(() => calculateWorkoutDuration({ ...base, recoverySeconds: -1 })).toThrow(CalculationError);
    expect(() => calculateWorkoutDuration({ ...base, intervalDistanceM: 0 })).toThrow(CalculationError);
    expect(() => calculateWorkoutDuration({ ...base, paceSecPerKm: 30 })).toThrow(CalculationError);
    expect(() => calculateWorkoutDuration({ ...base, kind: "time", intervalSeconds: 0 })).toThrow(
      CalculationError,
    );
  });
});
