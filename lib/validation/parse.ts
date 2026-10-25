import { formatClock } from "@/lib/format";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MINUTES_SECONDS = /^\d{1,3}:\d{2}$/;
const HOURS_MINUTES_SECONDS = /^\d{1,2}:\d{2}:\d{2}$/;

export interface DurationRules {
  label: string;
  min?: number;
  max?: number;
  allowZero?: boolean;
}

export function parseDuration(raw: string, rules: DurationRules): ParseResult<number> {
  const text = raw.trim();
  if (text === "") return { ok: false, error: `${rules.label} wajib diisi.` };

  let total: number;
  if (MINUTES_SECONDS.test(text)) {
    const [minutes, seconds] = text.split(":").map(Number);
    if (seconds > 59) return { ok: false, error: "Detik harus antara 00 dan 59." };
    total = minutes * 60 + seconds;
  } else if (HOURS_MINUTES_SECONDS.test(text)) {
    const [hours, minutes, seconds] = text.split(":").map(Number);
    if (minutes > 59) return { ok: false, error: "Menit harus antara 00 dan 59." };
    if (seconds > 59) return { ok: false, error: "Detik harus antara 00 dan 59." };
    total = hours * 3600 + minutes * 60 + seconds;
  } else {
    return { ok: false, error: "Gunakan format mm:ss atau h:mm:ss, contoh 25:30." };
  }

  if (total === 0 && !rules.allowZero) {
    return { ok: false, error: `${rules.label} harus lebih besar dari 0.` };
  }
  if (rules.min !== undefined && total < rules.min) {
    return { ok: false, error: `${rules.label} minimal ${formatClock(rules.min)}.` };
  }
  if (rules.max !== undefined && total > rules.max) {
    return { ok: false, error: `${rules.label} maksimal ${formatClock(rules.max)}.` };
  }
  return { ok: true, value: total };
}

export interface NumberRules {
  label: string;
  min: number;
  max: number;
  integer?: boolean;
}

export function parseNumber(raw: string, rules: NumberRules): ParseResult<number> {
  const text = raw.trim().replace(",", ".");
  if (text === "") return { ok: false, error: `${rules.label} wajib diisi.` };
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, error: `${rules.label} harus berupa angka.` };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, error: `${rules.label} harus berupa angka.` };
  if (rules.integer && !Number.isInteger(value)) {
    return { ok: false, error: `${rules.label} harus bilangan bulat.` };
  }
  if (value < rules.min || value > rules.max) {
    return { ok: false, error: `${rules.label} harus antara ${rules.min} dan ${rules.max}.` };
  }
  return { ok: true, value };
}

export function formatDurationInput(seconds: number | null): string {
  if (seconds === null) return "";
  return formatClock(seconds);
}

export function formatNumberInput(value: number | null): string {
  if (value === null) return "";
  return String(value);
}
