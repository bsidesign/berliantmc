"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Trophy, Copy, Check, X, Award, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
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

type Stage = "setup" | "qr" | "results";
type NameLists = Record<Category, string[]>;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// A short two-sided confetti burst, fired whenever a winner certificate opens.
function fireConfetti() {
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-[16px] font-semibold text-brand-dark-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "h-[50px] w-full rounded-lg border border-black/25 px-4 text-[16px] outline-none focus:border-brand-blue";

export default function BallotAdminPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [session, setSession] = useState<BallotSession | null>(null);
  const [speakers, setSpeakers] = useState<BallotSpeaker[]>([]);
  const [votes, setVotes] = useState<BallotVote[]>([]);

  const [clubName, setClubName] = useState("");
  const [room, setRoom] = useState("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [names, setNames] = useState<NameLists>({
    "Prepared Speech": [],
    "Evaluation Speech": [],
    "Table Topic": [],
  });
  const [draftName, setDraftName] = useState<Record<Category, string>>({
    "Prepared Speech": "",
    "Evaluation Speech": "",
    "Table Topic": "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<Record<Category, boolean>>({
    "Prepared Speech": false,
    "Evaluation Speech": false,
    "Table Topic": false,
  });
  const [certificate, setCertificate] = useState<Category | null>(null);

  const voteUrl =
    session && typeof window !== "undefined"
      ? `${window.location.origin}/ballot/vote/${session.code}`
      : "";

  // Votes are tallied quietly in the background so winners can be revealed
  // on demand — nothing here is rendered until a Reveal button is clicked.
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

  function addName(category: Category) {
    const value = draftName[category].trim();
    if (!value) return;
    setNames((prev) => ({ ...prev, [category]: [...prev[category], value] }));
    setDraftName((prev) => ({ ...prev, [category]: "" }));
    setFormError(null);
  }

  function removeName(category: Category, index: number) {
    setNames((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  }

  async function handleGenerate() {
    if (!clubName.trim() || !room.trim() || !eventDate) {
      setFormError("Please fill in the club name, room, and date.");
      return;
    }
    const emptyCategory = CATEGORIES.find((c) => names[c].length === 0);
    if (emptyCategory) {
      setFormError(`Please add at least one name for ${emptyCategory}.`);
      return;
    }

    setCreating(true);
    setFormError(null);
    const code = randomCode();
    const { data, error } = await supabase
      .from("ballot_sessions")
      .insert({ code, club_name: clubName.trim(), room: room.trim(), event_date: eventDate })
      .select()
      .single();

    if (error) {
      setCreating(false);
      setFormError(`Could not create session: ${error.message}`);
      return;
    }

    const newSession = data as BallotSession;
    const rows = CATEGORIES.flatMap((category) =>
      names[category].map((name) => ({ session_id: newSession.id, name, category }))
    );
    const { data: speakerRows, error: speakerError } = await supabase
      .from("ballot_speakers")
      .insert(rows)
      .select();

    setCreating(false);
    if (speakerError) {
      setFormError(`Could not add speakers: ${speakerError.message}`);
      return;
    }

    setSession(newSession);
    setSpeakers((speakerRows as BallotSpeaker[]) ?? []);
    setStage("qr");
  }

  function copyLink() {
    navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function winnerFor(category: Category) {
    const list = speakers.filter((s) => s.category === category);
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
    const winners = tally.filter((t) => t.count === top).map((t) => t.name);
    return { status: "decided" as const, names: winners };
  }

  function votesFor(category: Category) {
    return votes.filter((v) => v.category === category).length;
  }

  // Every time a certificate opens (first reveal or reopening one already
  // revealed), celebrate with a short confetti burst.
  useEffect(() => {
    if (certificate) fireConfetti();
  }, [certificate]);

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

  if (stage === "setup") {
    return (
      <>
        <Header />
        <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col items-center gap-10 px-6 py-16">
          <div className="flex max-w-[620px] flex-col items-center gap-1 text-center">
            <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
              Ballot Counter
            </h1>
            <p className="text-[18px] leading-[1.4]">
              Set up today&rsquo;s meeting and list the speakers eligible to vote in
              each category, then generate the voting QR code.
            </p>
          </div>

          <div className="flex w-full max-w-[720px] flex-col gap-4">
            <Field label="Toastmasters Club Name">
              <input
                value={clubName}
                onChange={(e) => {
                  setClubName(e.target.value);
                  setFormError(null);
                }}
                placeholder="Example: Berlian Toastmasters"
                className={inputClass}
              />
            </Field>
            <div className="grid w-full gap-4 sm:grid-cols-2">
              <Field label="Room / Location">
                <input
                  value={room}
                  onChange={(e) => {
                    setRoom(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Example: Mitsubishi Building 4th Floor"
                  className={inputClass}
                />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    setFormError(null);
                  }}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="grid w-full gap-6 sm:grid-cols-3">
            {CATEGORIES.map((category) => (
              <div
                key={category}
                className="flex flex-col gap-3 rounded-lg border border-brand-blue p-5"
              >
                <p className="text-[18px] font-semibold text-brand-dark-1">{category}</p>
                <div className="flex gap-2">
                  <input
                    value={draftName[category]}
                    onChange={(e) =>
                      setDraftName((prev) => ({ ...prev, [category]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addName(category);
                      }
                    }}
                    placeholder="Example: Lord Doni ..."
                    className="h-[44px] flex-1 rounded-lg border border-black/25 px-3 text-[15px] outline-none focus:border-brand-blue"
                  />
                  <button
                    onClick={() => addName(category)}
                    aria-label={`Add name to ${category}`}
                    className="flex size-[44px] shrink-0 items-center justify-center rounded-lg brand-gradient text-white"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {names[category].length === 0 ? (
                  <p className="text-[14px] text-brand-dark-3">No names added yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {names[category].map((name, i) => (
                      <li
                        key={`${name}-${i}`}
                        className="flex items-center justify-between rounded-lg bg-brand-blue/5 px-3 py-2 text-[14px]"
                      >
                        <span>{name}</span>
                        <button
                          onClick={() => removeName(category, i)}
                          aria-label={`Remove ${name}`}
                          className="text-brand-dark-3 hover:text-brand-dark-1"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {formError && <p className="text-[15px] font-medium text-[#f94444]">{formError}</p>}

          <button
            onClick={handleGenerate}
            disabled={creating}
            className="rounded-lg brand-gradient px-8 py-4 text-[16px] font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Generating..." : "Generate QR Code"}
          </button>
        </main>
      </>
    );
  }

  if (stage === "qr") {
    return (
      <>
        <Header />
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 brand-gradient p-8 text-center text-white">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[16px] font-semibold uppercase tracking-wide opacity-80">
              {clubName}
            </p>
            <p className="text-[14px] opacity-70">
              {room} &middot; {formatDate(eventDate)}
            </p>
          </div>
          <h1 className="text-[32px] font-extrabold sm:text-[42px]">Scan to Vote</h1>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-brand-dark-1">
            <p className="text-[14px] uppercase tracking-wide text-brand-dark-3">
              Members join with this code
            </p>
            <p className="text-[42px] font-semibold tracking-widest text-brand-blue">
              {session?.code}
            </p>
            <QRCodeSVG value={voteUrl} size={180} />
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
            {CATEGORIES.map((category) => (
              <p key={category} className="text-[15px] font-medium">
                {category} ({votesFor(category)})
              </p>
            ))}
          </div>

          <button
            onClick={() => setStage("results")}
            className="flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-[16px] font-semibold text-brand-blue"
          >
            <Trophy size={20} />
            Reveal Winners
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
            Reveal the Winners
          </h1>
          <p className="text-[18px] leading-[1.4] text-brand-dark-3">
            {clubName} &middot; {room} &middot; {formatDate(eventDate)}
          </p>
        </div>

        <div className="grid w-full gap-8 sm:grid-cols-3">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="flex flex-col items-center gap-5 rounded-2xl border border-brand-blue p-8 text-center"
            >
              <Trophy className="text-brand-blue" size={40} strokeWidth={1.5} />
              <p className="text-[21px] font-semibold text-brand-dark-1">{category}</p>
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
      </main>

      {certificate && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 p-10 text-center text-white brand-gradient"
          onClick={() => {
            setRevealed((prev) => ({ ...prev, [certificate]: true }));
            setCertificate(null);
          }}
        >
          <Award size={56} />
          <p className="text-[28px] font-semibold sm:text-[36px]">Congratulations!</p>
          <p className="text-[20px] font-medium opacity-90">
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
              <div className="flex flex-col items-center gap-1">
                {result.names.map((n) => (
                  <p
                    key={n}
                    className="max-w-[700px] text-[40px] font-semibold leading-tight sm:text-[56px]"
                  >
                    {n}
                  </p>
                ))}
              </div>
            );
          })()}
          <p className="max-w-[520px] text-[16px] leading-[1.5] opacity-80">
            Keep practicing, keep growing, and keep inspiring others with your voice.
          </p>
          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="text-[16px] font-semibold opacity-90">{clubName}</p>
            <p className="text-[14px] opacity-70">
              {room} | {formatDate(eventDate)}
            </p>
          </div>
          <span className="mt-4 text-white/70">Tap anywhere to close</span>
        </div>
      )}
    </>
  );
}