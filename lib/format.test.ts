import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatDistance,
  formatDurationWords,
  formatKm,
  formatMeters,
  formatPace,
  formatSignedClock,
  formatSignedSeconds,
  paceFromUnit,
  paceToUnit,
} from "./format";

describe("formatClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59)).toBe("0:59");
    expect(formatClock(298)).toBe("4:58");
    expect(formatClock(1500)).toBe("25:00");
  });

  it("adds hours from 60 minutes", () => {
    expect(formatClock(3599)).toBe("59:59");
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(14400)).toBe("4:00:00");
  });

  it("carries rounding into the next unit", () => {
    expect(formatClock(59.6)).toBe("1:00");
    expect(formatClock(3599.6)).toBe("1:00:00");
    expect(formatClock(299.4)).toBe("4:59");
  });
});

describe("pace", () => {
  it("formats pace per km", () => {
    expect(formatPace(298, "km")).toBe("4:58 /km");
  });

  it("converts to pace per mile", () => {
    expect(formatPace(300, "mi")).toBe("8:03 /mi");
    expect(paceToUnit(300, "km")).toBe(300);
    expect(paceFromUnit(paceToUnit(300, "mi"), "mi")).toBeCloseTo(300, 9);
  });
});

describe("signed values", () => {
  it("shows the sign of differences", () => {
    expect(formatSignedClock(-30)).toBe("-0:30");
    expect(formatSignedClock(75)).toBe("+1:15");
    expect(formatSignedClock(0)).toBe("0:00");
    expect(formatSignedSeconds(3)).toBe("+3");
    expect(formatSignedSeconds(-2)).toBe("-2");
    expect(formatSignedSeconds(0)).toBe("0");
  });
});

describe("distance", () => {
  it("trims decimals", () => {
    expect(formatKm(5)).toBe("5");
    expect(formatKm(21.0975)).toBe("21.1");
    expect(formatKm(42.195)).toBe("42.2");
    expect(formatKm(0.0975)).toBe("0.1");
  });

  it("formats distance in km and miles", () => {
    expect(formatDistance(10, "km")).toBe("10 km");
    expect(formatDistance(10, "mi")).toBe("6.2 mi");
    expect(formatMeters(800)).toBe("800 m");
    expect(formatMeters(1000)).toBe("1 km");
  });

  it("describes durations in words", () => {
    expect(formatDurationWords(2640)).toBe("44 mnt");
    expect(formatDurationWords(3725)).toBe("1 jam 2 mnt 5 dtk");
    expect(formatDurationWords(0)).toBe("0 dtk");
  });
});
