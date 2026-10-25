import { DEFAULT_STATE } from "@/lib/defaults";
import type { AppState } from "@/lib/types";
import { sanitizeState } from "./sanitize";

export const STORAGE_KEY = "runmetrics:v1";

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function readFromStorage(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_STATE;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export function getSnapshot(): AppState {
  if (cache === null) cache = readFromStorage();
  return cache;
}

export function getServerSnapshot(): AppState {
  return DEFAULT_STATE;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateState(updater: (state: AppState) => AppState): boolean {
  const next = updater(getSnapshot());
  cache = next;
  let saved = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    saved = false;
  }
  notify();
  return saved;
}

export function resetState(): boolean {
  cache = DEFAULT_STATE;
  let cleared = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    cleared = false;
  }
  notify();
  return cleared;
}
