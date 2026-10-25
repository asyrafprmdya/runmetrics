import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "@/lib/defaults";
import { sanitizeState } from "./sanitize";

function createFakeWindow(initial: Record<string, string> = {}, failWrites = false) {
  const data = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  return {
    data,
    window: { localStorage, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  };
}

async function loadStore() {
  vi.resetModules();
  return import("./store");
}

describe("sanitizeState", () => {
  it("falls back to defaults for junk", () => {
    expect(sanitizeState(null)).toBe(DEFAULT_STATE);
    expect(sanitizeState("text")).toBe(DEFAULT_STATE);
    expect(sanitizeState([])).toBe(DEFAULT_STATE);
    expect(sanitizeState({ version: 2 })).toBe(DEFAULT_STATE);
  });

  it("keeps valid values", () => {
    const state = sanitizeState({
      version: 1,
      profile: { age: 30, rhr: 55, hrMax: 190, hrMaxMode: "manual", hrMethod: "karvonen" },
      reference: { distanceKey: "10k", timeSeconds: 3000, testDate: "2026-10-01" },
      race: { distanceKey: "half", targetSeconds: 6600 },
      preferences: { paceUnit: "mi" },
    });
    expect(state.profile).toEqual({ age: 30, rhr: 55, hrMax: 190, hrMaxMode: "manual", hrMethod: "karvonen" });
    expect(state.reference).toEqual({ distanceKey: "10k", timeSeconds: 3000, testDate: "2026-10-01" });
    expect(state.race).toEqual({ distanceKey: "half", targetSeconds: 6600 });
    expect(state.preferences.paceUnit).toBe("mi");
  });

  it("resets tampered or out-of-range fields without losing the rest", () => {
    const state = sanitizeState({
      version: 1,
      profile: { age: 500, rhr: "55", hrMax: -1, hrMaxMode: "weird", hrMethod: 3 },
      reference: { distanceKey: "marathon", timeSeconds: 1, testDate: "yesterday" },
      race: { distanceKey: "10k", targetSeconds: 30 },
      split: { strategy: "wild", changePercent: 99, segmentKm: 3, overrides: { "1": 300, "x": 5, "2": -4 } },
      interval: { reps: 0, distanceM: 1, paceSeconds: 5 },
      calculator: { trainingType: "sprint", effortPercent: 5 },
      preferences: { paceUnit: "furlong" },
    });
    expect(state.profile).toEqual(DEFAULT_STATE.profile);
    expect(state.reference.distanceKey).toBe("5k");
    expect(state.reference.timeSeconds).toBeNull();
    expect(state.reference.testDate).toBe("");
    expect(state.race.targetSeconds).toBeNull();
    expect(state.split.strategy).toBe("even");
    expect(state.split.changePercent).toBe(DEFAULT_STATE.split.changePercent);
    expect(state.split.segmentKm).toBe(1);
    expect(state.split.overrides).toEqual({ "1": 300 });
    expect(state.interval.reps).toBe(DEFAULT_STATE.interval.reps);
    expect(state.interval.distanceM).toBe(DEFAULT_STATE.interval.distanceM);
    expect(state.interval.paceSeconds).toBeNull();
    expect(state.calculator).toEqual(DEFAULT_STATE.calculator);
    expect(state.preferences.paceUnit).toBe("km");
  });

  it("drops implausible reference times", () => {
    const state = sanitizeState({
      version: 1,
      reference: { distanceKey: "5k", timeSeconds: 600, testDate: "" },
    });
    expect(state.reference.timeSeconds).toBeNull();
  });
});

describe("store persistence", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns defaults on the server", async () => {
    const store = await loadStore();
    expect(store.getServerSnapshot()).toEqual(DEFAULT_STATE);
    expect(store.getSnapshot()).toEqual(DEFAULT_STATE);
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });

  it("persists across a simulated reload", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake.window);

    const first = await loadStore();
    const saved = first.updateState((state) => ({
      ...state,
      profile: { ...state.profile, age: 31 },
      reference: { ...state.reference, timeSeconds: 1500 },
    }));
    expect(saved).toBe(true);
    expect(JSON.parse(fake.data.get(first.STORAGE_KEY) as string).profile.age).toBe(31);

    const second = await loadStore();
    const reloaded = second.getSnapshot();
    expect(reloaded.profile.age).toBe(31);
    expect(reloaded.reference.timeSeconds).toBe(1500);
  });

  it("returns a stable snapshot until something changes", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake.window);
    const store = await loadStore();
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    store.updateState((state) => ({ ...state, preferences: { paceUnit: "mi" } }));
    const after = store.getSnapshot();
    expect(after).toBe(store.getSnapshot());
    expect(after.preferences.paceUnit).toBe("mi");
  });

  it("notifies subscribers on update and reset", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake.window);
    const store = await loadStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.updateState((state) => state);
    store.resetState();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.updateState((state) => state);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("survives corrupted JSON", async () => {
    const fake = createFakeWindow({ "runmetrics:v1": "{not json" });
    vi.stubGlobal("window", fake.window);
    const store = await loadStore();
    expect(store.getSnapshot()).toEqual(DEFAULT_STATE);
  });

  it("keeps state in memory when the browser refuses to write", async () => {
    const fake = createFakeWindow({}, true);
    vi.stubGlobal("window", fake.window);
    const store = await loadStore();
    const saved = store.updateState((state) => ({ ...state, profile: { ...state.profile, age: 40 } }));
    expect(saved).toBe(false);
    expect(store.getSnapshot().profile.age).toBe(40);
  });

  it("clears stored data on reset", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake.window);
    const store = await loadStore();
    store.updateState((state) => ({ ...state, profile: { ...state.profile, age: 40 } }));
    expect(fake.data.has(store.STORAGE_KEY)).toBe(true);
    store.resetState();
    expect(fake.data.has(store.STORAGE_KEY)).toBe(false);
    expect(store.getSnapshot()).toEqual(DEFAULT_STATE);

    const reloaded = await loadStore();
    expect(reloaded.getSnapshot()).toEqual(DEFAULT_STATE);
  });
});
