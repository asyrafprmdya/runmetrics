import { describe, expect, it } from "vitest";
import { CalculationError } from "./errors";
import {
  allocateSeconds,
  buildSegments,
  calculateHalfSplits,
  generateRaceSplits,
  type SplitStrategy,
} from "./splits";

const base = { distanceKm: 10, targetSeconds: 3000, strategy: "even" as SplitStrategy, changePercent: 3 };

describe("segments", () => {
  it("makes a partial final segment for half marathon", () => {
    const segments = buildSegments(21.0975, 1);
    expect(segments).toHaveLength(22);
    expect(segments[21].lengthKm).toBeCloseTo(0.0975, 9);
  });

  it("makes a partial final segment for marathon", () => {
    const segments = buildSegments(42.195, 1);
    expect(segments).toHaveLength(43);
    expect(segments[42].lengthKm).toBeCloseTo(0.195, 9);
  });

  it("does not create an empty trailing segment on whole distances", () => {
    expect(buildSegments(10, 1)).toHaveLength(10);
    expect(buildSegments(5, 5)).toHaveLength(1);
  });

  it("supports a segment longer than the distance", () => {
    const segments = buildSegments(5, 10);
    expect(segments).toHaveLength(1);
    expect(segments[0].lengthKm).toBe(5);
  });

  it("supports multi-km segments", () => {
    expect(buildSegments(21.0975, 5)).toHaveLength(5);
    expect(buildSegments(21.0975, 2)).toHaveLength(11);
  });
});

describe("allocateSeconds", () => {
  it("returns integers that sum exactly to the total", () => {
    const result = allocateSeconds([99.4, 100.3, 100.3], 300);
    expect(result.every(Number.isInteger)).toBe(true);
    expect(result.reduce((a, b) => a + b, 0)).toBe(300);
  });
});

describe("even split", () => {
  it("keeps every split at the same pace", () => {
    const plan = generateRaceSplits(base);
    expect(plan.rows).toHaveLength(10);
    expect(plan.rows.every((row) => row.seconds === 300)).toBe(true);
    expect(plan.totalSeconds).toBe(3000);
    expect(plan.avgPaceSecPerKm).toBe(300);
    expect(plan.differenceSeconds).toBe(0);
    expect(plan.rows[0].paceDeltaSeconds).toBeNull();
    expect(plan.rows[1].paceDeltaSeconds).toBe(0);
  });

  it("ignores changePercent", () => {
    const a = generateRaceSplits({ ...base, changePercent: 0 });
    const b = generateRaceSplits({ ...base, changePercent: 15 });
    expect(a.rows.map((r) => r.seconds)).toEqual(b.rows.map((r) => r.seconds));
  });

  it("handles a half marathon with a partial last split", () => {
    const plan = generateRaceSplits({ ...base, distanceKm: 21.0975, targetSeconds: 6000 });
    expect(plan.rows).toHaveLength(22);
    expect(plan.totalSeconds).toBe(6000);
    const last = plan.rows[21];
    expect(last.lengthKm).toBeCloseTo(0.0975, 9);
    expect(last.paceSecPerKm).toBeGreaterThan(270);
    expect(last.paceSecPerKm).toBeLessThan(300);
    expect(plan.rows[20].cumulativeSeconds + last.seconds).toBe(6000);
  });

  it("handles a marathon", () => {
    const plan = generateRaceSplits({ ...base, distanceKm: 42.195, targetSeconds: 14400 });
    expect(plan.rows).toHaveLength(43);
    expect(plan.totalSeconds).toBe(14400);
    expect(plan.rows[42].cumulativeSeconds).toBe(14400);
  });
});

describe("negative split", () => {
  it("makes the second half faster than the first", () => {
    for (const distanceKm of [5, 10, 21.0975, 42.195]) {
      const plan = generateRaceSplits({
        ...base,
        distanceKm,
        targetSeconds: Math.round(distanceKm * 300),
        strategy: "negative",
        changePercent: 3,
      });
      const halves = calculateHalfSplits(plan.rows, distanceKm);
      expect(halves.secondHalfPaceSecPerKm).toBeLessThan(halves.firstHalfPaceSecPerKm);
      expect(plan.rows[0].paceSecPerKm).toBeGreaterThan(plan.rows[plan.rows.length - 2].paceSecPerKm);
    }
  });

  it("never gets slower from one split to the next by more than rounding", () => {
    const plan = generateRaceSplits({ ...base, strategy: "negative", changePercent: 3 });
    for (let i = 1; i < plan.rows.length; i += 1) {
      expect(plan.rows[i].seconds).toBeLessThanOrEqual(plan.rows[i - 1].seconds + 1);
    }
  });

  it("starts above and ends below the average pace", () => {
    const plan = generateRaceSplits({ ...base, strategy: "negative", changePercent: 6 });
    expect(plan.rows[0].paceSecPerKm).toBeGreaterThan(plan.avgPaceSecPerKm);
    expect(plan.rows[9].paceSecPerKm).toBeLessThan(plan.avgPaceSecPerKm);
  });
});

describe("positive split", () => {
  it("makes the second half slower than the first", () => {
    for (const distanceKm of [5, 10, 21.0975, 42.195]) {
      const plan = generateRaceSplits({
        ...base,
        distanceKm,
        targetSeconds: Math.round(distanceKm * 300),
        strategy: "positive",
        changePercent: 3,
      });
      const halves = calculateHalfSplits(plan.rows, distanceKm);
      expect(halves.secondHalfPaceSecPerKm).toBeGreaterThan(halves.firstHalfPaceSecPerKm);
      expect(plan.rows[0].paceSecPerKm).toBeLessThan(plan.rows[plan.rows.length - 2].paceSecPerKm);
    }
  });

  it("starts below and ends above the average pace", () => {
    const plan = generateRaceSplits({ ...base, strategy: "positive", changePercent: 6 });
    expect(plan.rows[0].paceSecPerKm).toBeLessThan(plan.avgPaceSecPerKm);
    expect(plan.rows[9].paceSecPerKm).toBeGreaterThan(plan.avgPaceSecPerKm);
  });
});

describe("total time consistency", () => {
  it("always sums to the target across many combinations", () => {
    const strategies: SplitStrategy[] = ["even", "negative", "positive"];
    const distances = [5, 10, 21.0975, 42.195];
    const changes = [0, 1, 3, 7.5, 20];
    const segmentLengths = [1, 2, 5];
    const targets = [1, 1500, 3127, 6001, 14399];

    for (const distanceKm of distances) {
      for (const strategy of strategies) {
        for (const changePercent of changes) {
          for (const segmentKm of segmentLengths) {
            for (const factor of targets) {
              const targetSeconds = Math.max(distanceKm * 120, factor);
              const plan = generateRaceSplits({
                distanceKm,
                targetSeconds,
                strategy,
                changePercent,
                segmentKm,
              });
              expect(plan.totalSeconds).toBe(Math.round(targetSeconds));
              expect(plan.rows.every((row) => Number.isInteger(row.seconds) && row.seconds >= 1)).toBe(true);
              const lengthSum = plan.rows.reduce((total, row) => total + row.lengthKm, 0);
              expect(lengthSum).toBeCloseTo(distanceKm, 9);
            }
          }
        }
      }
    }
  });

  it("keeps cumulative time consistent with split times", () => {
    const plan = generateRaceSplits({ ...base, strategy: "negative", changePercent: 5 });
    let running = 0;
    for (const row of plan.rows) {
      running += row.seconds;
      expect(row.cumulativeSeconds).toBe(running);
    }
  });
});

describe("manual edits", () => {
  it("redistributes remaining time when total is locked", () => {
    const plan = generateRaceSplits({ ...base, overrides: { "2": 330 }, lockTotal: true });
    expect(plan.totalSeconds).toBe(3000);
    expect(plan.rows[2].seconds).toBe(330);
    expect(plan.rows[2].edited).toBe(true);
    for (const row of plan.rows.filter((r) => r.index !== 2)) {
      expect(row.seconds).toBeGreaterThanOrEqual(296);
      expect(row.seconds).toBeLessThanOrEqual(297);
      expect(row.edited).toBe(false);
    }
  });

  it("changes the total when the lock is off", () => {
    const plan = generateRaceSplits({ ...base, overrides: { "2": 330 }, lockTotal: false });
    expect(plan.totalSeconds).toBe(3030);
    expect(plan.differenceSeconds).toBe(30);
    expect(plan.avgPaceSecPerKm).toBeCloseTo(303, 9);
    expect(plan.rows.filter((r) => r.index !== 2).every((r) => r.seconds === 300)).toBe(true);
  });

  it("follows the edited splits when every split is edited", () => {
    const overrides: Record<string, number> = {};
    for (let i = 0; i < 10; i += 1) overrides[String(i)] = 290;
    const plan = generateRaceSplits({ ...base, overrides, lockTotal: true });
    expect(plan.totalSeconds).toBe(2900);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("warns when an edit leaves no time for the other splits", () => {
    const plan = generateRaceSplits({ ...base, overrides: { "0": 2995 }, lockTotal: true });
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.totalSeconds).toBeGreaterThan(3000);
  });

  it("ignores overrides for splits that do not exist or have bad values", () => {
    const plan = generateRaceSplits({
      ...base,
      overrides: { "99": 100, "-1": 100, "abc": 100, "3": 0, "4": Number.NaN },
      lockTotal: true,
    });
    expect(plan.rows.every((row) => !row.edited)).toBe(true);
    expect(plan.totalSeconds).toBe(3000);
  });

  it("works with edits on the partial final split", () => {
    const plan = generateRaceSplits({
      ...base,
      distanceKm: 21.0975,
      targetSeconds: 6000,
      overrides: { "21": 40 },
      lockTotal: true,
    });
    expect(plan.rows[21].seconds).toBe(40);
    expect(plan.totalSeconds).toBe(6000);
  });
});

describe("validation", () => {
  it("rejects invalid options", () => {
    expect(() => generateRaceSplits({ ...base, distanceKm: 0 })).toThrow(CalculationError);
    expect(() => generateRaceSplits({ ...base, distanceKm: -5 })).toThrow(CalculationError);
    expect(() => generateRaceSplits({ ...base, targetSeconds: 0 })).toThrow(CalculationError);
    expect(() => generateRaceSplits({ ...base, targetSeconds: Number.NaN })).toThrow(CalculationError);
    expect(() => generateRaceSplits({ ...base, changePercent: -1 })).toThrow(CalculationError);
    expect(() => generateRaceSplits({ ...base, changePercent: 25 })).toThrow(CalculationError);
    expect(() => generateRaceSplits({ ...base, segmentKm: 0 })).toThrow(CalculationError);
  });
});

describe("half split helper", () => {
  it("splits time at the exact halfway point even inside a segment", () => {
    const plan = generateRaceSplits({ ...base, distanceKm: 5, targetSeconds: 1500, segmentKm: 2 });
    const halves = calculateHalfSplits(plan.rows, 5);
    expect(halves.firstHalfSeconds + halves.secondHalfSeconds).toBeCloseTo(1500, 6);
    expect(halves.firstHalfPaceSecPerKm).toBeCloseTo(300, 0);
  });
});
