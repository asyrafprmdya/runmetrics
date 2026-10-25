import { KM_PER_MILE } from "@/lib/calculations/constants";

export type PaceUnit = "km" | "mi";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function paceToUnit(secPerKm: number, unit: PaceUnit): number {
  return unit === "mi" ? secPerKm * KM_PER_MILE : secPerKm;
}

export function paceFromUnit(secPerUnit: number, unit: PaceUnit): number {
  return unit === "mi" ? secPerUnit / KM_PER_MILE : secPerUnit;
}

export function formatClock(totalSeconds: number): string {
  const total = Math.round(Math.abs(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

export function formatPaceValue(secPerKm: number, unit: PaceUnit): string {
  return formatClock(paceToUnit(secPerKm, unit));
}

export function paceUnitLabel(unit: PaceUnit): string {
  return unit === "mi" ? "/mi" : "/km";
}

export function formatPace(secPerKm: number, unit: PaceUnit): string {
  return `${formatPaceValue(secPerKm, unit)} ${paceUnitLabel(unit)}`;
}

export function formatSignedClock(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded === 0) return "0:00";
  return `${rounded > 0 ? "+" : "-"}${formatClock(rounded)}`;
}

export function formatSignedSeconds(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded)}`;
}

export function formatKm(km: number): string {
  return Number(km.toFixed(1)).toString();
}

export function formatDistance(km: number, unit: PaceUnit): string {
  if (unit === "mi") return `${formatKm(km / KM_PER_MILE)} mi`;
  return `${formatKm(km)} km`;
}

export function formatMeters(meters: number): string {
  if (meters >= 1000 && meters % 1000 === 0) return `${meters / 1000} km`;
  return `${Math.round(meters)} m`;
}

export function formatDurationWords(totalSeconds: number): string {
  const total = Math.round(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} mnt`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} dtk`);
  return parts.join(" ");
}
