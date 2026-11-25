import { supabase, randomCode } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Meeting = {
  id: string;
  code: string;
  club_name: string;
  voting_open: boolean;
  created_at: string;
};

export type Speaker = {
  id: string;
  meeting_id: string;
  name: string;
  role: string;
  /** Seconds the Timer recorded for this person (null until timed). */
  speech_seconds: number | null;
  /** Timer category id used when timing (see timer-categories.ts). */
  timer_category: string | null;
  timer_note: string | null;
  /** False when the speaker ran past the "black" light. */
  eligible: boolean;
  filler_count: number;
  wod_count: number;
  created_at: string;
};

export type Vote = {
  id: string;
  meeting_id: string;
  speaker_id: string;
  category: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Roles & voting categories
// ---------------------------------------------------------------------------

export const BALLOT_CATEGORIES = ["Prepared Speech", "Evaluation Speech", "Table Topic"] as const;
export type BallotCategory = (typeof BALLOT_CATEGORIES)[number];

export type RoleDef = {
  label: string;
  /** Maximum role takers allowed in one meeting. */
  max: number;
  /** Timer category selected automatically for this role. */
  timerCategoryId?: string;
  /** Voting category this role competes in (if any). */
  ballotCategory?: BallotCategory;
};

// The Timer picks one of these for every name it adds. Every role is timed;
// the Ah & WoD Counter can count all of them, and the Ballot only uses the
// ones with a ballotCategory.
export const SPEAKER_ROLES: RoleDef[] = [
  { label: "Prepared Speaker", max: 5, timerCategoryId: "prepared", ballotCategory: "Prepared Speech" },
  { label: "Evaluator", max: 5, timerCategoryId: "evaluation", ballotCategory: "Evaluation Speech" },
  { label: "Table Topic Speaker", max: 10, timerCategoryId: "tabletopic", ballotCategory: "Table Topic" },
  { label: "General Evaluator", max: 1, timerCategoryId: "general" },
];

export function roleDef(label: string): RoleDef | undefined {
  return SPEAKER_ROLES.find((r) => r.label === label);
}

/** The voting category this speaker can be voted into, or null. */
export function votableCategory(s: Speaker): BallotCategory | null {
  if (!s.eligible) return null;
  return roleDef(s.role)?.ballotCategory ?? null;
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

// Every call goes through a database function that checks the meeting code,
// so nobody can read or change a meeting without knowing its code.

export async function createMeeting(
  clubName: string
): Promise<{ meeting?: Meeting; error?: string }> {
  // Codes are random, so retry in the (unlikely) event of a collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.rpc("create_meeting", {
      p_code: randomCode(),
      p_club_name: clubName,
    });
    if (!error) return { meeting: data as Meeting };
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Could not generate a unique meeting code. Please try again." };
}

/** The meeting and its speakers in one call, or null if the code doesn't exist. */
export async function fetchMeetingWithSpeakers(
  code: string
): Promise<{ meeting: Meeting; speakers: Speaker[] } | null> {
  const { data, error } = await supabase.rpc("get_meeting", { p_code: code.trim().toUpperCase() });
  if (error) throw error; // network/database trouble: keep showing the last data
  return (data as { meeting: Meeting; speakers: Speaker[] } | null) ?? null;
}

export async function fetchMeetingByCode(code: string): Promise<Meeting | null> {
  const { data } = await supabase.rpc("get_meeting", { p_code: code.trim().toUpperCase() });
  return (data as { meeting: Meeting } | null)?.meeting ?? null;
}

export async function addSpeaker(code: string, name: string, role: string) {
  return supabase.rpc("add_meeting_speaker", { p_code: code, p_name: name, p_role: role });
}

export async function removeSpeaker(code: string, speakerId: string) {
  return supabase.rpc("delete_meeting_speaker", { p_code: code, p_speaker_id: speakerId });
}

export async function saveTiming(
  code: string,
  speakerId: string,
  seconds: number,
  categoryId: string,
  note: string,
  eligible: boolean
) {
  return supabase.rpc("update_meeting_speaker_timing", {
    p_code: code,
    p_speaker_id: speakerId,
    p_changes: {
      speech_seconds: Math.round(seconds),
      timer_category: categoryId,
      timer_note: note,
      eligible,
    },
  });
}

export async function clearTiming(code: string, speakerId: string) {
  return supabase.rpc("update_meeting_speaker_timing", {
    p_code: code,
    p_speaker_id: speakerId,
    p_changes: { speech_seconds: null, timer_category: null, timer_note: null, eligible: true },
  });
}

/** Atomic +/- on the server so two counters tapping at once never clash. */
export async function bumpCount(
  code: string,
  speakerId: string,
  field: "filler" | "wod",
  delta: number
) {
  return supabase.rpc("bump_meeting_speaker_count", {
    p_code: code,
    p_speaker_id: speakerId,
    p_field: field,
    p_delta: delta,
  });
}

export async function setVotingOpen(code: string, open: boolean) {
  return supabase.rpc("set_meeting_voting", { p_code: code, p_open: open });
}

/** All votes in the meeting (voter ids are never sent back). */
export async function fetchVotes(code: string): Promise<Vote[]> {
  const { data } = await supabase.rpc("get_meeting_votes", { p_code: code });
  return (data as Vote[]) ?? [];
}

/** category -> speaker id this browser already voted for. */
export async function fetchMyVotes(code: string, voterId: string): Promise<Record<string, string>> {
  const { data } = await supabase.rpc("get_my_votes", { p_code: code, p_voter_id: voterId });
  const map: Record<string, string> = {};
  for (const v of (data as { category: string; speaker_id: string }[]) ?? []) {
    map[v.category] = v.speaker_id;
  }
  return map;
}

export async function castVote(code: string, speakerId: string, category: string, voterId: string) {
  return supabase.rpc("cast_meeting_vote", {
    p_code: code,
    p_speaker_id: speakerId,
    p_category: category,
    p_voter_id: voterId,
  });
}

/**
 * Live updates: calls onChange whenever anything in this meeting changes
 * (meeting, speakers or votes). Returns a function that stops listening.
 */
export function onMeetingChange(code: string, onChange: () => void) {
  const channel = supabase
    .channel(`meeting:${code.trim().toUpperCase()}`)
    .on("broadcast", { event: "changed" }, () => onChange())
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

export function formatMeetingDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
