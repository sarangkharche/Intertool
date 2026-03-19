"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

export interface UserPreferences {
  accentColor: "blue" | "violet" | "green" | "orange" | "rose";
  density: "compact" | "comfortable";
  defaultView: "grid" | "list";
  defaultTab: "all" | "skill" | "mcp-server" | "agent-tool" | "prompt-template" | "mine";
  defaultSort: "newest" | "name";
  itemsPerPage: 12 | 24 | 48;
  landingPage: "dashboard" | "search";
}

const STORAGE_KEY = "intertool-prefs";

const DEFAULTS: UserPreferences = {
  accentColor: "blue",
  density: "comfortable",
  defaultView: "grid",
  defaultTab: "all",
  defaultSort: "newest",
  itemsPerPage: 24,
  landingPage: "dashboard",
};

function getStoredPrefs(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

let listeners: Array<() => void> = [];
let cachedPrefs: UserPreferences | null = null;

function getSnapshot(): UserPreferences {
  if (cachedPrefs === null) cachedPrefs = getStoredPrefs();
  return cachedPrefs;
}

function getServerSnapshot(): UserPreferences {
  return DEFAULTS;
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedPrefs = getStoredPrefs();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferences(): [
  UserPreferences,
  (key: keyof UserPreferences, value: string | number) => void,
] {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPreference = useCallback(
    (key: keyof UserPreferences, value: string | number) => {
      const coerced = key === "itemsPerPage" ? Number(value) : value;
      const next = { ...getStoredPrefs(), [key]: coerced };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage quota exceeded — preferences won't persist
      }
      cachedPrefs = next;
      listeners.forEach((l) => l());
      // Dispatch storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify(next) })
      );
    },
    []
  );

  return [prefs, setPreference];
}
