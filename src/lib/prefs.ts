"use client";

import { useSyncExternalStore } from "react";

export type Prefs = {
  theme: "dark" | "light";
  reducedMotion: boolean;
  colorBlind: boolean;
  voice: boolean;
};

const KEY = "ipl-prefs";
const DEFAULTS: Prefs = { theme: "light", reducedMotion: false, colorBlind: false, voice: false };

let current: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULTS;
}

/** Mirrors the prefs onto <html> so CSS can react (also done before paint by the inline script in layout). */
export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.motion = p.reducedMotion ? "reduced" : "full";
  root.dataset.cb = p.colorBlind ? "1" : "0";
}

export function getPrefsSnapshot(): Prefs {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    current = load();
    applyPrefs(current);
  }
  return current;
}

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...getPrefsSnapshot(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  applyPrefs(current);
  listeners.forEach((l) => l());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getPrefsSnapshot,
    () => DEFAULTS,
  );
}
