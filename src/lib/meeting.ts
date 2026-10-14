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
  voter_id: string;
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

export async function createMeeting(
  clubName: string
): Promise<{ meeting?: Meeting; error?: string }> {
  // Codes are random, so retry in the (unlikely) event of a collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("meetings")
      .insert({ code: randomCode(), club_name: clubName })
      .select()
      .single();
    if (!error) return { meeting: data as Meeting };
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Could not generate a unique meeting code. Please try again." };
}

export async function fetchMeetingByCode(code: string): Promise<Meeting | null> {
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  return (data as Meeting | null) ?? null;
}

export async function fetchSpeakers(meetingId: string): Promise<Speaker[]> {
  const { data } = await supabase
    .from("meeting_speakers")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });
  return (data as Speaker[]) ?? [];
}

export async function addSpeaker(meetingId: string, name: string, role: string) {
  return supabase.from("meeting_speakers").insert({ meeting_id: meetingId, name, role });
}

export async function removeSpeaker(speakerId: string) {
  return supabase.from("meeting_speakers").delete().eq("id", speakerId);
}

export async function saveTiming(
  speakerId: string,
  seconds: number,
  categoryId: string,
  note: string,
  eligible: boolean
) {
  return supabase
    .from("meeting_speakers")
    .update({
      speech_seconds: Math.round(seconds),
      timer_category: categoryId,
      timer_note: note,
      eligible,
    })
    .eq("id", speakerId);
}

export async function clearTiming(speakerId: string) {
  return supabase
    .from("meeting_speakers")
    .update({ speech_seconds: null, timer_category: null, timer_note: null, eligible: true })
    .eq("id", speakerId);
}

/** Atomic +/- on the server so two counters tapping at once never clash. */
export async function bumpCount(speakerId: string, field: "filler" | "wod", delta: number) {
  return supabase.rpc("bump_speaker_count", {
    p_speaker: speakerId,
    p_field: field,
    p_delta: delta,
  });
}

export async function setVotingOpen(meetingId: string, open: boolean) {
  return supabase.from("meetings").update({ voting_open: open }).eq("id", meetingId);
}

export async function fetchVotes(meetingId: string): Promise<Vote[]> {
  const { data } = await supabase.from("meeting_votes").select("*").eq("meeting_id", meetingId);
  return (data as Vote[]) ?? [];
}

export async function castVote(
  meetingId: string,
  speakerId: string,
  category: string,
  voterId: string
) {
  return supabase.from("meeting_votes").insert({
    meeting_id: meetingId,
    speaker_id: speakerId,
    category,
    voter_id: voterId,
  });
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
