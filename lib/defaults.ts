import type { AppState } from "@/lib/types";

export const DEFAULT_STATE: AppState = {
  version: 1,
  profile: {
    age: null,
    rhr: null,
    hrMax: null,
    hrMaxMode: "estimate",
    hrMethod: "hrmax",
  },
  reference: {
    distanceKey: "5k",
    timeSeconds: null,
    testDate: "",
  },
  race: {
    distanceKey: "10k",
    targetSeconds: null,
  },
  split: {
    strategy: "even",
    changePercent: 3,
    targetMode: "finish",
    targetPaceSeconds: null,
    segmentKm: 1,
    lockTotal: true,
    overrides: {},
  },
  interval: {
    kind: "distance",
    reps: 5,
    distanceM: 800,
    durationSeconds: 180,
    paceMode: "reference",
    paceSeconds: null,
    recoverySeconds: 120,
    warmupSeconds: 600,
    coolDownSeconds: 600,
  },
  calculator: {
    trainingType: "easy",
    effortPercent: 65,
  },
  preferences: {
    paceUnit: "km",
  },
};
