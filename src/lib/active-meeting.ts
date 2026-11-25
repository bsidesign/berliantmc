"use client";

import { useMemo, useSyncExternalStore } from "react";

// The meeting this device has joined (and the role screen it last used),
// remembered in localStorage so a refresh or re-opened tab picks up where the
// person left off.
const KEY = "berlian-tmc-active-meeting";
const RESUME_FLAG = "berlian-tmc-resumed"; // sessionStorage: auto-resume once per tab
const EVENT = "berlian-tmc-active-meeting-change";

export type ActiveMeeting = {
  code: string;
  /** href of the last role screen used, e.g. "/timer". */
  role?: string;
};

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

function write(value: ActiveMeeting | null) {
  try {
    if (value) window.localStorage.setItem(KEY, JSON.stringify(value));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked (private mode); the app still works for this tab.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function setActiveMeeting(code: string) {
  write({ code: code.toUpperCase() });
}

export function setActiveRole(role: string) {
  const current = parseActive(readRaw());
  if (current && current.role !== role) write({ ...current, role });
}

export function clearActiveMeeting() {
  write(null);
  try {
    window.sessionStorage.removeItem(RESUME_FLAG);
  } catch {
    // ignore
  }
}

/** True once this tab has already been auto-resumed (or the person navigated manually). */
export function hasResumed(): boolean {
  try {
    return window.sessionStorage.getItem(RESUME_FLAG) === "1";
  } catch {
    return true;
  }
}

export function markResumed() {
  try {
    window.sessionStorage.setItem(RESUME_FLAG, "1");
  } catch {
    // ignore
  }
}

function parseActive(raw: string | null): ActiveMeeting | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveMeeting;
    return parsed && typeof parsed.code === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** The joined meeting for this device, or null. Always null on the server. */
export function useActiveMeeting(): ActiveMeeting | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseActive(raw), [raw]);
}

/** false while rendering on the server / during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
