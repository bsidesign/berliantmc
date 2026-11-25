"use client";

import { useMemo, useSyncExternalStore } from "react";
import { TIMER_CATEGORIES, type TimerCategory } from "@/lib/timer-categories";

// Per-device timer light settings. The built-in values in timer-categories.ts
// are the defaults; anything the Timer customizes is saved here (localStorage)
// and applied on top, so the settings survive refreshes and later meetings.
const KEY = "berlian-tmc-timer-settings";
const EVENT = "berlian-tmc-timer-settings-change";

export type Thresholds = Pick<TimerCategory, "green" | "yellow" | "red" | "black">;
type Overrides = Record<string, Thresholds>;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function parse(raw: string | null): Overrides {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, Partial<Thresholds>>;
    const out: Overrides = {};
    for (const [id, t] of Object.entries(data ?? {})) {
      if (
        t &&
        [t.green, t.yellow, t.red, t.black].every((n) => typeof n === "number" && n >= 0) &&
        validateThresholds(t as Thresholds) === null
      ) {
        out[id] = t as Thresholds;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(next: Overrides) {
  try {
    if (Object.keys(next).length > 0) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked (private mode); the change then lasts until refresh only.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Returns an error message, or null when the four times make sense together. */
export function validateThresholds(t: Thresholds): string | null {
  if (![t.green, t.yellow, t.red, t.black].every((n) => Number.isFinite(n) && n >= 0)) {
    return "Please enter valid numbers.";
  }
  if (t.green <= 0) return "Green must be later than 00:00.";
  if (!(t.green < t.yellow && t.yellow < t.red && t.red < t.black)) {
    return "Times must go in order: Green, then Yellow, then Red, then Black.";
  }
  return null;
}

export function saveThresholds(categoryId: string, t: Thresholds) {
  write({ ...parse(readRaw()), [categoryId]: t });
}

export function resetThresholds(categoryId: string) {
  const next = parse(readRaw());
  delete next[categoryId];
  write(next);
}

/** Timer categories with this device's customizations applied. */
export function useTimerCategories() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => {
    const overrides = parse(raw);
    return {
      categories: TIMER_CATEGORIES.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c)),
      isCustomized: (id: string) => id in overrides,
    };
  }, [raw]);
}
