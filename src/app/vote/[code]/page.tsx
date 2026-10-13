"use client";

import { use, useEffect, useState } from "react";
import { Vote as VoteIcon, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { BALLOT_CATEGORIES, castVote, votableCategory, type BallotCategory } from "@/lib/meeting";
import { useMeetingData } from "@/lib/use-meeting";
import { getVoterId } from "@/lib/voter";

function Message({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="flex max-w-[480px] flex-col gap-2 text-brand-dark-3">{children}</div>
      </main>
    </>
  );
}

// Opened from the "Scan to Vote" QR code. Voters don't need to join the
// meeting as a role taker — the code in the link is all they need.
export default function VotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { meeting, speakers, status } = useMeetingData(code.toUpperCase());
  const meetingId = meeting?.id ?? null;

  // category -> speaker id this browser already voted for. null until the
  // lookup finishes, so a returning voter never sees live "Vote!" buttons for
  // something they already voted on.
  const [mine, setMine] = useState<{ meetingId: string; votes: Record<string, string> } | null>(
    null
  );
  const myVotes = mine && mine.meetingId === meetingId ? mine.votes : null;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    async function loadMine() {
      const { data } = await supabase
        .from("meeting_votes")
        .select("category, speaker_id")
        .eq("meeting_id", meetingId)
        .eq("voter_id", getVoterId());
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const v of data ?? []) map[v.category] = v.speaker_id;
      setMine({ meetingId: meetingId!, votes: map });
    }
    void loadMine();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  async function vote(speakerId: string, category: BallotCategory) {
    if (!meeting) return;
    setError(null);
    const { error: err } = await castVote(meeting.id, speakerId, category, getVoterId());
    if (err) {
      if (err.code === "23505") {
        setError(`You've already voted for ${category}.`);
      } else {
        setError(`Could not submit your vote: ${err.message}`);
      }
      return;
    }
    setMine((prev) =>
      prev ? { ...prev, votes: { ...prev.votes, [category]: speakerId } } : prev
    );
  }

  if (!isSupabaseConfigured) {
    return <Message>The app isn&rsquo;t connected to its database yet.</Message>;
  }

  if (status === "loading") {
    return <Message>Loading...</Message>;
  }

  if (status === "missing" || !meeting) {
    return (
      <Message>
        <p>
          No meeting found for code <strong>{code.toUpperCase()}</strong>. Double-check the code
          with the Ballot Counter.
        </p>
      </Message>
    );
  }

  if (!myVotes) {
    return <Message>Loading...</Message>;
  }

  const hasVoted = Object.keys(myVotes).length > 0;

  if (!meeting.voting_open) {
    return (
      <Message>
        <p className="text-[21px] font-extrabold text-brand-dark-1">
          {hasVoted ? "Thanks for voting!" : "Voting isn't open yet"}
        </p>
        <p>
          {hasVoted
            ? "Voting is closed. Watch the screen for the winners."
            : "Hang tight — this page opens the ballot automatically as soon as the Ballot Counter starts voting."}
        </p>
      </Message>
    );
  }

  const categoriesInUse = BALLOT_CATEGORIES.filter((c) =>
    speakers.some((s) => votableCategory(s) === c)
  );

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[643px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[14px] font-semibold uppercase tracking-wide text-brand-blue">
            {meeting.club_name}
          </p>
          <h1 className="text-[32px] font-extrabold sm:text-[42px]">Ballot Counter</h1>
          <p className="text-[18px]">Vote for the best speakers!</p>
        </div>

        {error && <p className="text-[15px] font-medium text-[#f94444]">{error}</p>}

        {categoriesInUse.length === 0 ? (
          <p className="text-brand-dark-3">No speakers are up for a vote yet.</p>
        ) : (
          <div className="flex w-full flex-col gap-10">
            {categoriesInUse.map((category) => {
              const candidates = speakers.filter((s) => votableCategory(s) === category);
              const votedFor = myVotes[category];
              return (
                <div key={category} className="flex w-full flex-col gap-3.5">
                  <h2 className="text-[24px] font-extrabold text-brand-dark-1">{category}</h2>
                  {candidates.map((s) => {
                    const isVotedForThis = votedFor === s.id;
                    const alreadyVoted = Boolean(votedFor);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between gap-4 rounded-lg border p-5 ${
                          isVotedForThis ? "border-brand-blue bg-brand-blue/5" : "border-brand-dark-4"
                        }`}
                      >
                        <p className="font-semibold">{s.name}</p>
                        <button
                          disabled={alreadyVoted}
                          onClick={() => vote(s.id, category)}
                          className={`flex w-[110px] shrink-0 items-center justify-center gap-1 rounded-lg py-3 text-[14px] font-semibold text-white disabled:opacity-40 ${
                            isVotedForThis ? "bg-[#14c801]" : "brand-gradient"
                          }`}
                        >
                          {isVotedForThis ? (
                            <>
                              <CheckCircle2 size={16} /> Voted!
                            </>
                          ) : (
                            <>
                              <VoteIcon size={16} /> Vote!
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
