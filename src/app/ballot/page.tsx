"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trophy, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/Header";
import {
  supabase,
  isSupabaseConfigured,
  CATEGORIES,
  randomCode,
  type Category,
  type BallotSession,
  type BallotSpeaker,
  type BallotVote,
} from "@/lib/supabase";

export default function BallotAdminPage() {
  const [session, setSession] = useState<BallotSession | null>(null);
  const [speakers, setSpeakers] = useState<BallotSpeaker[]>([]);
  const [votes, setVotes] = useState<BallotVote[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const voteUrl =
    session && typeof window !== "undefined"
      ? `${window.location.origin}/ballot/vote/${session.code}`
      : "";

  // Live vote tally: subscribe once we have a session.
  useEffect(() => {
    if (!session) return;
    supabase
      .from("ballot_votes")
      .select("*")
      .eq("session_id", session.id)
      .then(({ data }) => setVotes((data as BallotVote[]) ?? []));

    const channel = supabase
      .channel(`votes-${session.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ballot_votes", filter: `session_id=eq.${session.id}` },
        (payload) => setVotes((prev) => [...prev, payload.new as BallotVote])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function createSession() {
    setCreating(true);
    const code = randomCode();
    const { data, error } = await supabase
      .from("ballot_sessions")
      .insert({ code })
      .select()
      .single();
    setCreating(false);
    if (error) {
      alert(`Could not create session: ${error.message}`);
      return;
    }
    setSession(data as BallotSession);
  }

  async function addSpeaker() {
    if (!session || !name.trim() || !category) return;
    const { data, error } = await supabase
      .from("ballot_speakers")
      .insert({ session_id: session.id, name: name.trim(), category })
      .select()
      .single();
    if (error) {
      alert(`Could not add speaker: ${error.message}`);
      return;
    }
    setSpeakers((prev) => [...prev, data as BallotSpeaker]);
    setName("");
    setCategory("");
  }

  function copyLink() {
    navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!isSupabaseConfigured) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="max-w-[500px] text-brand-dark-3">
            Ballot Counter isn&rsquo;t connected to a database yet. Add the
            Supabase environment variables in your deployment settings, then
            redeploy, to enable voting.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header section="Ballot Counter" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-10 px-6 py-16">
        {!session ? (
          <div className="flex max-w-[500px] flex-col items-center gap-4 text-center">
            <h1 className="text-[32px] font-semibold leading-tight sm:text-[42px]">
              Ballot Counter
            </h1>
            <p className="text-[18px] leading-[1.4]">
              Create a session for today&rsquo;s meeting, add the eligible speakers, then
              share the join code so members can vote from their own phones.
            </p>
            <button
              onClick={createSession}
              disabled={creating}
              className="rounded-lg brand-gradient px-6 py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Meeting Session"}
            </button>
          </div>
        ) : (
          <div className="grid w-full max-w-[1080px] gap-12 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-[32px] font-semibold leading-tight sm:text-[42px]">
                  Ballot Counter
                </h1>
                <p className="text-[18px] leading-[1.4]">
                  Enter the speakers eligible to vote for each session.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 rounded-lg border border-brand-blue p-6 text-center">
                <p className="text-[14px] uppercase tracking-wide text-brand-dark-3">
                  Members join with this code
                </p>
                <p className="text-[42px] font-semibold tracking-widest text-brand-blue">
                  {session.code}
                </p>
                <QRCodeSVG value={voteUrl} size={140} />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 text-[14px] font-semibold text-brand-dark-2"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy voting link"}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[21px] font-semibold">Member&rsquo;s Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Example: Lord Doni ..."
                    className="h-[50px] rounded-lg border border-black/25 px-4 text-[18px] outline-none focus:border-brand-blue"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[21px] font-semibold">Role</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="h-[50px] rounded-lg border border-black/25 px-4 text-[18px] text-brand-dark-1/70 outline-none focus:border-brand-blue"
                  >
                    <option value="">Choose Role</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addSpeaker}
                  className="flex h-[50px] items-center justify-center gap-2 rounded-lg brand-gradient text-[13px] font-semibold text-white"
                >
                  <UserPlus size={18} /> Add Speaker
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div>
                <h2 className="mb-3 text-[28px] font-semibold">Speakers</h2>
                {speakers.length === 0 ? (
                  <p className="text-brand-dark-3">No data to display.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {speakers.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-brand-dark-4 px-4 py-3"
                      >
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-brand-dark-3">{s.category}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-[28px] font-semibold">Live Results</h2>
                {CATEGORIES.filter((c) => speakers.some((s) => s.category === c)).map(
                  (c) => {
                    const list = speakers
                      .filter((s) => s.category === c)
                      .map((s) => ({
                        ...s,
                        count: votes.filter((v) => v.speaker_id === s.id).length,
                      }))
                      .sort((a, b) => b.count - a.count);
                    const topCount = list[0]?.count ?? 0;
                    return (
                      <div key={c} className="mb-4">
                        <p className="mb-1 text-[16px] font-semibold text-brand-dark-2">
                          {c}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {list.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between rounded-lg border border-brand-dark-4 px-3 py-2 text-[14px]"
                            >
                              <span className="flex items-center gap-1.5">
                                {s.count > 0 && s.count === topCount && (
                                  <Trophy size={14} className="text-brand-blue" />
                                )}
                                {s.name}
                              </span>
                              <span>{s.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
