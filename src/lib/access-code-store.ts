"use client";

import { useSyncExternalStore } from "react";

/*
 * The Learn access code, remembered for the current browser tab only
 * (sessionStorage), so learners type it once per tab. Storage can be
 * unavailable (private windows, blocked site data); every access is guarded
 * and the app simply asks for the code again.
 */
const KEY = "codebuddy.accessCode";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveAccessCode(code: string): void {
  try {
    if (code) window.sessionStorage.setItem(KEY, code);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Not persisted; the learner will be asked again next time.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** The saved code, or "" on the server and when nothing is saved. */
export function useSavedAccessCode(): string {
  return useSyncExternalStore(subscribe, read, () => "");
}
