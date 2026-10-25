import { describe, expect, it } from "vitest";
import { DEFAULT_STATE } from "@/lib/defaults";
import {
  localDateString,
  profileToDraft,
  referenceToDraft,
  validateReferenceDraft,
  type ReferenceDraft,
} from "./drafts";

const TODAY = "2026-10-25";

function draft(overrides: Partial<ReferenceDraft> = {}): ReferenceDraft {
  return { distanceKey: "5k", time: "25:00", testDate: "", ...overrides };
}

describe("validateReferenceDraft", () => {
  it("menerima waktu valid tanpa tanggal", () => {
    const result = validateReferenceDraft(draft(), TODAY, true);
    expect(result.errors).toEqual({});
    expect(result.reference).toEqual({ distanceKey: "5k", timeSeconds: 1500, testDate: "" });
  });

  it("menolak waktu kosong kalau wajib", () => {
    const result = validateReferenceDraft(draft({ time: "" }), TODAY, true);
    expect(result.reference).toBeNull();
    expect(result.errors.time).toBeDefined();
  });

  it("mengizinkan waktu kosong kalau opsional dan menghasilkan null", () => {
    const result = validateReferenceDraft(draft({ time: "  " }), TODAY, false);
    expect(result.reference?.timeSeconds).toBeNull();
  });

  it("tetap memvalidasi waktu yang diisi meski opsional", () => {
    const result = validateReferenceDraft(draft({ time: "99:99" }), TODAY, false);
    expect(result.reference).toBeNull();
    expect(result.errors.time).toBeDefined();
  });

  it("menolak pace yang mustahil untuk jarak tes", () => {
    const result = validateReferenceDraft(draft({ time: "3:00" }), TODAY, true);
    expect(result.reference).toBeNull();
    expect(result.errors.time).toBeDefined();
  });

  it("menolak menit lebih dari 59 pada format jam", () => {
    const result = validateReferenceDraft(draft({ distanceKey: "half", time: "1:75:00" }), TODAY, true);
    expect(result.reference).toBeNull();
  });

  it("menolak tanggal di masa depan", () => {
    const result = validateReferenceDraft(draft({ testDate: "2026-10-26" }), TODAY, true);
    expect(result.errors.testDate).toMatch(/masa depan/);
    expect(result.reference).toBeNull();
  });

  it("menerima tanggal hari ini", () => {
    const result = validateReferenceDraft(draft({ testDate: TODAY }), TODAY, true);
    expect(result.reference?.testDate).toBe(TODAY);
  });

  it("menolak tanggal yang tidak ada di kalender", () => {
    expect(validateReferenceDraft(draft({ testDate: "2026-02-30" }), TODAY, true).errors.testDate).toBeDefined();
    expect(validateReferenceDraft(draft({ testDate: "bukan-tanggal" }), TODAY, true).errors.testDate).toBeDefined();
  });

  it("menerima 29 Februari hanya di tahun kabisat", () => {
    expect(validateReferenceDraft(draft({ testDate: "2024-02-29" }), TODAY, true).reference).not.toBeNull();
    expect(validateReferenceDraft(draft({ testDate: "2025-02-29" }), TODAY, true).errors.testDate).toBeDefined();
  });

  it("melaporkan error waktu dan tanggal sekaligus", () => {
    const result = validateReferenceDraft(draft({ time: "abc", testDate: "2099-01-01" }), TODAY, true);
    expect(result.errors.time).toBeDefined();
    expect(result.errors.testDate).toBeDefined();
  });
});

describe("draft converters", () => {
  it("referenceToDraft dan kembali menghasilkan nilai yang sama", () => {
    const reference = { distanceKey: "10k" as const, timeSeconds: 3015, testDate: "2026-05-01" };
    const result = validateReferenceDraft(referenceToDraft(reference), TODAY, true);
    expect(result.reference).toEqual(reference);
  });

  it("referenceToDraft menghasilkan string kosong untuk waktu null", () => {
    expect(referenceToDraft(DEFAULT_STATE.reference).time).toBe("");
  });

  it("profileToDraft mengubah null menjadi string kosong", () => {
    const result = profileToDraft(DEFAULT_STATE.profile);
    expect(result.age).toBe("");
    expect(result.rhr).toBe("");
    expect(result.hrMax).toBe("");
  });

  it("localDateString memakai nol di depan", () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateString(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
