"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchMeetingByCode,
  fetchSpeakers,
  type Meeting,
  type Speaker,
} from "@/lib/meeting";
import {
  clearActiveMeeting,
  markResumed,
  setActiveRole,
  useActiveMeeting,
  useHydrated,
} from "@/lib/active-meeting";

type Status = "loading" | "ready" | "missing";

type MeetingData = {
  /** Which code this data was loaded for (guards against showing a stale meeting). */
  code: string | null;
  meeting: Meeting | null;
  speakers: Speaker[];
  status: Status;
};

const EMPTY: MeetingData = { code: null, meeting: null, speakers: [], status: "loading" };

// How often to re-read the meeting as a safety net behind Realtime (which can
// drop on flaky venue Wi-Fi). Cheap: one tiny meeting row + a short speaker list.
const POLL_MS = 5000;

/**
 * Live view of one meeting and its speaker list. Updates arrive over Supabase
 * Realtime, with a slow poll as a fallback. `runMutation` wraps a write so a
 * stale in-flight refresh can't flash old numbers over an optimistic update.
 */
export function useMeetingData(code: string | null) {
  const [data, setData] = useState<MeetingData>(EMPTY);
  const inflight = useRef(0);
  const reloadRef = useRef<() => Promise<void>>(async () => {});
  const current = data.code === code ? data : EMPTY;
  const meetingId = current.meeting?.id ?? null;

  useEffect(() => {
    if (!code || !isSupabaseConfigured) return;
    const activeCode = code;
    let cancelled = false;

    async function refresh() {
      const meeting = await fetchMeetingByCode(activeCode);
      if (cancelled || inflight.current > 0) return;
      if (!meeting) {
        setData({ code: activeCode, meeting: null, speakers: [], status: "missing" });
        return;
      }
      const speakers = await fetchSpeakers(meeting.id);
      if (cancelled || inflight.current > 0) return;
      setData({ code: activeCode, meeting, speakers, status: "ready" });
    }

    reloadRef.current = refresh;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);

    // Realtime: any change to this meeting or its speakers triggers a refresh.
    const channel = meetingId
      ? supabase
          .channel(`meeting-${meetingId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "meetings", filter: `id=eq.${meetingId}` },
            () => void refresh()
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "meeting_speakers",
              filter: `meeting_id=eq.${meetingId}`,
            },
            () => void refresh()
          )
          .subscribe()
      : null;

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [code, meetingId]);

  const reload = useCallback(() => reloadRef.current(), []);

  /** Optimistically patch one speaker locally (the next refresh confirms it). */
  const patchSpeaker = useCallback((id: string, patch: Partial<Speaker>) => {
    setData((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const runMutation = useCallback(async <T,>(write: () => PromiseLike<T>): Promise<T> => {
    inflight.current += 1;
    try {
      return await write();
    } finally {
      inflight.current -= 1;
      void reloadRef.current();
    }
  }, []);

  return {
    meeting: current.meeting,
    speakers: current.speakers,
    status: current.status,
    reload,
    patchSpeaker,
    runMutation,
  };
}

/**
 * Gate for every role screen: sends the person back to the homepage if this
 * device hasn't joined a meeting (or the meeting was deleted), remembers which
 * role screen they're on, and returns the live meeting data.
 */
export function useRequireMeeting(roleHref: string) {
  const router = useRouter();
  const hydrated = useHydrated();
  const active = useActiveMeeting();
  const data = useMeetingData(active?.code ?? null);

  useEffect(() => {
    if (hydrated && !active) router.replace("/");
  }, [hydrated, active, router]);

  useEffect(() => {
    if (hydrated && active) {
      markResumed();
      setActiveRole(roleHref);
    }
  }, [hydrated, active, roleHref]);

  useEffect(() => {
    if (data.status === "missing") {
      clearActiveMeeting();
      router.replace("/");
    }
  }, [data.status, router]);

  return {
    ...data,
    configured: isSupabaseConfigured,
    ready: hydrated && Boolean(active) && data.status === "ready",
  };
}

/** Same gate without data fetching, for screens that don't need meeting rows. */
export function useRequireActiveMeeting(roleHref: string) {
  const router = useRouter();
  const hydrated = useHydrated();
  const active = useActiveMeeting();

  useEffect(() => {
    if (hydrated && !active) router.replace("/");
  }, [hydrated, active, router]);

  useEffect(() => {
    if (hydrated && active) {
      markResumed();
      setActiveRole(roleHref);
    }
  }, [hydrated, active, roleHref]);

  return hydrated && Boolean(active);
}
