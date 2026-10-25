import { describe, expect, it } from "vitest";
import {
  parseDuration,
  parseNumber,
  validatePaceInput,
  validateProfileDraft,
  validateRaceTarget,
  validateTestTime,
  type ProfileDraft,
} from "./index";

describe("parseDuration", () => {
  const rules = { label: "Waktu" };

  it("parses mm:ss and h:mm:ss", () => {
    expect(parseDuration("25:30", rules)).toEqual({ ok: true, value: 1530 });
    expect(parseDuration(" 1:45:30 ", rules)).toEqual({ ok: true, value: 6330 });
    expect(parseDuration("0:30", rules)).toEqual({ ok: true, value: 30 });
  });

  it("rejects empty, zero, malformed, and out-of-range input", () => {
    for (const bad of ["", "   ", "0:00", "25", "25:5", "abc", "-5:00", "25:60", "1:60:00", "1:30:75", "1:2:3:4", "5.30"]) {
      expect(parseDuration(bad, rules).ok).toBe(false);
    }
  });

  it("allows zero when requested", () => {
    expect(parseDuration("0:00", { label: "Recovery", allowZero: true })).toEqual({ ok: true, value: 0 });
  });

  it("enforces min and max", () => {
    expect(parseDuration("0:30", { label: "X", min: 60 }).ok).toBe(false);
    expect(parseDuration("2:00", { label: "X", max: 60 }).ok).toBe(false);
  });
});

describe("parseNumber", () => {
  const rules = { label: "Umur", min: 10, max: 100, integer: true };

  it("parses valid numbers, including a decimal comma", () => {
    expect(parseNumber("30", rules)).toEqual({ ok: true, value: 30 });
    expect(parseNumber("30,5", { label: "X", min: 0, max: 100 })).toEqual({ ok: true, value: 30.5 });
  });

  it("rejects empty, text, exponent, range and fractions", () => {
    for (const bad of ["", "abc", "1e2", "9", "101", "30.5", "NaN", "Infinity", "--5"]) {
      expect(parseNumber(bad, rules).ok).toBe(false);
    }
  });
});

describe("test time and targets", () => {
  it("accepts realistic times", () => {
    expect(validateTestTime("25:00", 5).ok).toBe(true);
    expect(validateTestTime("1:45:00", 21.0975).ok).toBe(true);
  });

  it("rejects absurd times", () => {
    expect(validateTestTime("1:00", 5).ok).toBe(false);
    expect(validateTestTime("10:00", 5).ok).toBe(false);
    expect(validateTestTime("120:00", 5).ok).toBe(false);
    expect(validateTestTime("", 5).ok).toBe(false);
    expect(validateTestTime("abc", 5).ok).toBe(false);
  });

  it("validates race targets against distance", () => {
    expect(validateRaceTarget("4:00:00", "marathon").ok).toBe(true);
    expect(validateRaceTarget("0:30:00", "marathon").ok).toBe(false);
    expect(validateRaceTarget("1:49:30", "half").ok).toBe(true);
  });

  it("validates pace input in km and miles", () => {
    expect(validatePaceInput("5:00", "km", "Pace")).toEqual({ ok: true, value: 300 });
    expect(validatePaceInput("8:03", "mi", "Pace")).toEqual({ ok: true, value: 300 });
    expect(validatePaceInput("1:00", "km", "Pace").ok).toBe(false);
    expect(validatePaceInput("20:00", "km", "Pace").ok).toBe(false);
  });
});

describe("validateProfileDraft", () => {
  const draft: ProfileDraft = { age: "30", rhr: "55", hrMaxMode: "estimate", hrMax: "", hrMethod: "hrmax" };

  it("accepts an estimated HRmax profile", () => {
    const result = validateProfileDraft(draft);
    expect(result.profile).toEqual({ age: 30, rhr: 55, hrMax: null, hrMaxMode: "estimate", hrMethod: "hrmax" });
  });

  it("requires age when HRmax is estimated", () => {
    const result = validateProfileDraft({ ...draft, age: "" });
    expect(result.profile).toBeNull();
    expect(result.errors.age).toBeDefined();
  });

  it("does not require age or RHR for manual HRmax with percent-of-max zones", () => {
    const result = validateProfileDraft({ age: "", rhr: "", hrMaxMode: "manual", hrMax: "190", hrMethod: "hrmax" });
    expect(result.profile?.hrMax).toBe(190);
    expect(result.profile?.age).toBeNull();
    expect(result.profile?.rhr).toBeNull();
  });

  it("requires RHR for Karvonen", () => {
    const result = validateProfileDraft({ ...draft, rhr: "", hrMethod: "karvonen" });
    expect(result.profile).toBeNull();
    expect(result.errors.rhr).toBeDefined();
  });

  it("rejects RHR that is not below HRmax", () => {
    const result = validateProfileDraft({ age: "", rhr: "190", hrMaxMode: "manual", hrMax: "190", hrMethod: "hrmax" });
    expect(result.profile).toBeNull();
    expect(result.errors.rhr).toBeDefined();
  });

  it("rejects extreme ages and out-of-range values", () => {
    expect(validateProfileDraft({ ...draft, age: "5" }).errors.age).toBeDefined();
    expect(validateProfileDraft({ ...draft, age: "150" }).errors.age).toBeDefined();
    expect(validateProfileDraft({ ...draft, rhr: "10" }).errors.rhr).toBeDefined();
    expect(
      validateProfileDraft({ ...draft, hrMaxMode: "manual", hrMax: "300" }).errors.hrMax,
    ).toBeDefined();
  });
});
