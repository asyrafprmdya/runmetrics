"use client";

import { useSyncExternalStore } from "react";
import type { AppState } from "@/lib/types";
import { getServerSnapshot, getSnapshot, resetState, subscribe, updateState } from "./store";

const subscribeNothing = (): (() => void) => () => {};
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;

export function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNothing, clientSnapshot, serverSnapshot);
}

export interface AppStateApi {
  state: AppState;
  ready: boolean;
  update: (updater: (state: AppState) => AppState) => boolean;
  reset: () => boolean;
}

export function useAppState(): AppStateApi {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useIsClient();
  return { state, ready, update: updateState, reset: resetState };
}
