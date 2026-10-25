import { DISTANCES, type TestDistanceKey } from "@/lib/calculations/constants";
import type { Profile, Reference } from "@/lib/types";
import { validateTestTime, type ProfileDraft } from "./index";
import { formatDurationInput, formatNumberInput } from "./parse";

export interface ReferenceDraft {
  distanceKey: TestDistanceKey;
  time: string;
  testDate: string;
}

export interface ReferenceErrors {
  time?: string;
  testDate?: string;
}

export interface ReferenceValidation {
  errors: ReferenceErrors;
  reference: Reference | null;
}

export function profileToDraft(profile: Profile): ProfileDraft {
  return {
    age: formatNumberInput(profile.age),
    rhr: formatNumberInput(profile.rhr),
    hrMaxMode: profile.hrMaxMode,
    hrMax: formatNumberInput(profile.hrMax),
    hrMethod: profile.hrMethod,
  };
}

export function referenceToDraft(reference: Reference): ReferenceDraft {
  return {
    distanceKey: reference.distanceKey,
    time: formatDurationInput(reference.timeSeconds),
    testDate: reference.testDate,
  };
}

export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateReferenceDraft(
  draft: ReferenceDraft,
  today: string,
  required: boolean,
): ReferenceValidation {
  const errors: ReferenceErrors = {};
  const distanceKm = DISTANCES[draft.distanceKey].km;

  let timeSeconds: number | null = null;
  if (draft.time.trim() !== "" || required) {
    const parsed = validateTestTime(draft.time, distanceKm);
    if (parsed.ok) timeSeconds = parsed.value;
    else errors.time = parsed.error;
  }

  const date = draft.testDate.trim();
  if (date !== "") {
    if (!isRealDate(date)) errors.testDate = "Tanggal tidak valid.";
    else if (date > today) errors.testDate = "Tanggal tes tidak boleh di masa depan.";
  }

  if (errors.time || errors.testDate) return { errors, reference: null };

  return {
    errors,
    reference: { distanceKey: draft.distanceKey, timeSeconds, testDate: date },
  };
}
