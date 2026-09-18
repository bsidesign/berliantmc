"use client";

import { use, useEffect, useState } from "react";
import { Vote as VoteIcon, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import {
  supabase,
  isSupabaseConfigured,
  CATEGORIES,
  type BallotSession,
  type BallotSpeaker,
} from "@/lib/supabase";
import { getVoterId } from "@/lib/voter";

type Status = "loading" | "not-found" | "ready";

export default function VotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? "loading" : "not-found"
  );
  const [session, setSession] = useState<BallotSession | null>(null);
  const [speakers, setSpeakers] = useState<BallotSpeaker[]>([]);
  const [votedCategories, setVotedCategories] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const voterId = getVoterId();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    async function load() {
      const { data: sessionData } = await supabase
        .from("ballot_sessions")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (!sessionData) {
        if (!cancelled) setStatus("not-found");
        return;
      }
      if (cancelled) return;
      setSession(sessionData as BallotSession);

      const { data: speakerData } = await supabase
        .from("ballot_speakers")
        .select("*")
        .eq("session_id", sessionData.id);
      if (!cancelled) setSpeakers((speakerData as BallotSpeaker[]) ?? []);

      const { data: myVotes } = await supabase
        .from("ballot_votes")
        .select("*")
        .eq("session_id", sessionData.id)
        .eq("voter_id", voterId);
      if (!cancelled) {
        const map: Record<string, string> = {};
        for (const v of myVotes ?? []) map[v.category] = v.speaker_id;
        setVotedCategories(map);
      }
      if (!cancelled) setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const categoriesInUse = CATEGORIES.filter((c) => speakers.some((s) => s.category === c));
  const activeCategory = categoriesInUse[activeIdx];
  const currentSpeakers = speakers.filter((s) => s.category === activeCategory);

  async function vote(speakerId: string) {
    if (!session || !activeCategory) return;
    const { error } = await supabase.from("ballot_votes").insert({
      session_id: session.id,
      speaker_id: speakerId,
      category: activeCategory,
      voter_id: voterId,
    });
    if (error) {
      if (error.code === "23505") {
        alert("You've already voted in this category.");
      } else {
        alert(`Could not submit vote: ${error.message}`);
      }
      return;
    }
    setVotedCategories((prev) => ({ ...prev, [activeCategory]: speakerId }));
  }

  if (status === "loading") {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-brand-dark-3">Loading session...</p>
        </main>
      </>
    );
  }

  if (status === "not-found") {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="text-brand-dark-3">
            No open voting session found for code <strong>{code}</strong>. Double-check
            the code with the Ballot Counter officer.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header section="Ballot Counter" />
      <main className="mx-auto flex w-full max-w-[643px] flex-1 flex-col items-center gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-[32px] font-semibold sm:text-[42px]">Ballot Counter</h1>
          <p className="text-[18px]">Vote for the best speakers!</p>
        </div>

        {categoriesInUse.length === 0 ? (
          <p className="text-brand-dark-3">
            No speakers have been added to this session yet.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-4">
              {categoriesInUse.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-1.5 rounded-full border border-brand-blue px-5 py-3.5 text-[16px] font-semibold sm:text-[21px] ${
                    i === activeIdx ? "brand-gradient text-white" : ""
                  }`}
                >
                  {votedCategories[c] && <CheckCircle2 size={16} />}
                  {c}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-3.5">
              {currentSpeakers.map((s) => {
                const votedFor = votedCategories[activeCategory];
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
                      onClick={() => vote(s.id)}
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
          </>
        )}
      </main>
    </>
  );
}
