"use client";

import { useEffect, useState } from "react";
import { Trophy, Copy, Check, Award, UserRound, Vote as VoteIcon, Pause } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import Header from "@/components/Header";
import MeetingBar from "@/components/MeetingBar";
import { supabase } from "@/lib/supabase";
import {
  BALLOT_CATEGORIES,
  fetchVotes,
  formatMeetingDate,
  roleDef,
  setVotingOpen,
  votableCategory,
  type BallotCategory,
  type Vote,
} from "@/lib/meeting";
import { useRequireMeeting } from "@/lib/use-meeting";

type View = "main" | "results";

// A short two-sided confetti burst, fired whenever a winner certificate opens.
function fireConfetti() {
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function BallotPage() {
  const { meeting, speakers, ready, configured, runMutation } = useRequireMeeting("/ballot");
  const meetingId = meeting?.id ?? null;

  const [view, setView] = useState<View>("main");
  const [votes, setVotes] = useState<Vote[]>([]);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<Record<BallotCategory, boolean>>({
    "Prepared Speech": false,
    "Evaluation Speech": false,
    "Table Topic": false,
  });
  const [certificate, setCertificate] = useState<BallotCategory | null>(null);

  // Votes are tallied quietly in the background so winners can be revealed on
  // demand — only the per-category headcount is shown while voting is open.
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    const load = async () => {
      const latest = await fetchVotes(meetingId);
      if (!cancelled) setVotes(latest);
    };
    void load();
    const timer = setInterval(() => void load(), 4000);
    const channel = supabase
      .channel(`votes-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_votes",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => void load()
      )
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Every time a certificate opens (first reveal or reopening one already
  // revealed), celebrate with a short confetti burst.
  useEffect(() => {
    if (certificate) fireConfetti();
  }, [certificate]);

  if (!configured) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="max-w-[500px] text-brand-dark-3">
            The app isn&rsquo;t connected to its database yet. Add the Supabase environment
            variables in your deployment settings, then redeploy.
          </p>
        </main>
      </>
    );
  }

  if (!ready || !meeting) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-brand-dark-3">Loading meeting...</p>
        </main>
      </>
    );
  }

  const voteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/vote/${meeting.code}` : "";
  const dateLabel = formatMeetingDate(meeting.created_at);

  const candidates = (category: BallotCategory) =>
    speakers.filter((s) => votableCategory(s) === category);
  const overTime = speakers.filter((s) => !s.eligible && roleDef(s.role)?.ballotCategory);
  const hasCandidates = BALLOT_CATEGORIES.some((c) => candidates(c).length > 0);
  const votesFor = (category: BallotCategory) =>
    votes.filter((v) => v.category === category).length;

  function winnerFor(category: BallotCategory) {
    const list = candidates(category);
    if (list.length === 0) {
      return { status: "no-speakers" as const, names: [] as string[] };
    }
    const tally = list.map((s) => ({
      name: s.name,
      count: votes.filter((v) => v.speaker_id === s.id).length,
    }));
    const top = Math.max(...tally.map((t) => t.count));
    if (top === 0) {
      return { status: "no-votes" as const, names: [] as string[] };
    }
    // A single top scorer is the automatic winner; a tie lists every name.
    return {
      status: "decided" as const,
      names: tally.filter((t) => t.count === top).map((t) => t.name),
    };
  }

  function copyLink() {
    navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function startVoting() {
    if (!meeting) return;
    await runMutation(() => setVotingOpen(meeting.id, true));
    setView("main");
  }

  async function stopVoting() {
    if (!meeting) return;
    await runMutation(() => setVotingOpen(meeting.id, false));
  }

  async function revealWinners() {
    if (!meeting) return;
    await runMutation(() => setVotingOpen(meeting.id, false));
    setView("results");
  }

  // ---- Voting is open: full-screen QR for everyone to scan -----------------
  if (view === "main" && meeting.voting_open) {
    return (
      <>
        <Header />
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto brand-gradient p-8 text-center text-white">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[16px] font-semibold uppercase tracking-wide opacity-80">
              {meeting.club_name}
            </p>
            <p className="text-[14px] opacity-70">{dateLabel}</p>
          </div>
          <h1 className="text-[32px] font-extrabold sm:text-[42px]">Scan to Vote</h1>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-brand-dark-1">
            <QRCodeSVG value={voteUrl} size={200} />
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-[14px] font-semibold text-brand-dark-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy voting link"}
            </button>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="text-[13px] font-semibold uppercase tracking-wide opacity-80">
              People Voted
            </p>
            {BALLOT_CATEGORIES.map((category) => (
              <p key={category} className="text-[15px] font-medium">
                {category} ({votesFor(category)})
              </p>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={revealWinners}
              className="flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-[16px] font-semibold text-brand-blue"
            >
              <Trophy size={20} />
              Reveal Winners
            </button>
            <button
              onClick={stopVoting}
              className="flex items-center gap-2 rounded-lg border border-white/60 px-6 py-4 text-[16px] font-semibold text-white"
            >
              <Pause size={18} />
              Pause Voting
            </button>
          </div>
        </div>
      </>
    );
  }

  // ---- Results: reveal each category's winner -------------------------------
  if (view === "results") {
    return (
      <>
        <Header />
        <MeetingBar clubName={meeting.club_name} code={meeting.code} />
        <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center gap-10 px-6 py-16">
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
              Reveal the Winners
            </h1>
            <p className="text-[18px] leading-[1.4] text-brand-dark-3">
              {meeting.club_name} &middot; {dateLabel}
            </p>
          </div>

          <div className="grid w-full gap-8 sm:grid-cols-3">
            {BALLOT_CATEGORIES.map((category) => (
              <div
                key={category}
                className="flex flex-col items-center gap-5 rounded-2xl border border-brand-blue p-8 text-center"
              >
                <Trophy className="text-brand-blue" size={40} strokeWidth={1.5} />
                <p className="text-[21px] font-extrabold text-brand-dark-1">{category}</p>
                <button
                  onClick={() => setCertificate(category)}
                  className="flex items-center gap-2 rounded-lg brand-gradient px-6 py-3.5 text-[15px] font-semibold text-white"
                >
                  {revealed[category] ? (
                    <>
                      <Award size={16} /> View Certificate
                    </>
                  ) : (
                    "Reveal Winner"
                  )}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={startVoting}
            className="text-[15px] font-semibold text-brand-blue"
          >
            Reopen voting
          </button>
        </main>

        {certificate && (
          <div
            className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-between gap-10 overflow-y-auto px-10 py-10 text-white brand-gradient sm:flex-row sm:px-[20vw] sm:py-16"
            onClick={() => {
              setRevealed((prev) => ({ ...prev, [certificate]: true }));
              setCertificate(null);
            }}
          >
            <div className="flex w-full flex-1 flex-col items-start gap-6 text-left">
              <Award size={56} />
              <p className="text-[28px] font-semibold sm:text-[36px]">Congratulations!</p>
              <p className="rounded-lg border border-white px-4 py-2 text-[20px] font-medium uppercase opacity-90">
                You&rsquo;re the Best {certificate}
              </p>
              {(() => {
                const result = winnerFor(certificate);
                if (result.status === "no-speakers") {
                  return (
                    <p className="text-[28px] font-semibold sm:text-[36px]">No speakers added</p>
                  );
                }
                if (result.status === "no-votes") {
                  return (
                    <p className="text-[28px] font-semibold sm:text-[36px]">No votes were cast</p>
                  );
                }
                return (
                  <div className="flex flex-col items-start gap-1">
                    {result.names.map((n) => (
                      <p
                        key={n}
                        className="text-[40px] font-extrabold leading-tight sm:text-[56px]"
                      >
                        {n}
                      </p>
                    ))}
                  </div>
                );
              })()}
              <p className="text-[16px] leading-[1.5] text-white opacity-100">
                Keep practicing, keep growing,
                <br />
                and keep inspiring others with your voice.
              </p>
              <div className="mt-4 flex flex-col items-start gap-1">
                <p className="text-[16px] font-semibold opacity-90">{meeting.club_name}</p>
                <p className="text-[14px] opacity-70">{dateLabel}</p>
              </div>
            </div>

            {/* Photo-op backdrop: point the winner here for the on-stage photo. */}
            <div className="flex shrink-0 items-center justify-center rounded-[40px] bg-white/10 p-6 opacity-40 sm:p-10">
              <UserRound
                size={180}
                fill="currentColor"
                stroke="none"
                className="text-white sm:size-[240px]"
              />
            </div>

            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40">
              Tap anywhere to close
            </span>
          </div>
        )}
      </>
    );
  }

  // ---- Ready: review candidates, then start voting --------------------------
  return (
    <>
      <Header />
      <MeetingBar clubName={meeting.club_name} code={meeting.code} />
      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex max-w-[620px] flex-col items-center gap-1 text-center">
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
            Ballot Counter
          </h1>
          <p className="text-[18px] leading-[1.4]">
            When the speeches are done, start voting. Everyone scans a QR code and votes on
            their own phone &mdash; the candidates below come from the Timer&rsquo;s list.
          </p>
        </div>

        <div className="grid w-full gap-6 sm:grid-cols-3">
          {BALLOT_CATEGORIES.map((category) => {
            const list = candidates(category);
            return (
              <div
                key={category}
                className="flex flex-col gap-3 rounded-lg border border-brand-blue p-5"
              >
                <p className="text-[18px] font-extrabold text-brand-dark-1">{category}</p>
                {list.length === 0 ? (
                  <p className="text-[14px] text-brand-dark-3">
                    No candidates yet &mdash; the Timer adds speakers.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {list.map((s) => (
                      <li key={s.id} className="rounded-lg bg-brand-blue/5 px-3 py-2 text-[14px]">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {overTime.length > 0 && (
          <p className="max-w-[620px] text-center text-[14px] text-brand-dark-3">
            Not eligible (outside the time limits):{" "}
            {overTime.map((s) => s.name).join(", ")}
          </p>
        )}

        <button
          onClick={startVoting}
          disabled={!hasCandidates}
          className="flex items-center gap-2 rounded-lg brand-gradient px-8 py-4 text-[16px] font-semibold text-white disabled:opacity-50"
        >
          <VoteIcon size={20} />
          Start Voting
        </button>

        {votes.length > 0 && (
          <button
            onClick={revealWinners}
            className="flex items-center gap-2 text-[15px] font-semibold text-brand-blue"
          >
            <Trophy size={16} /> Reveal winners from votes so far
          </button>
        )}
      </main>
    </>
  );
}
