"use client";

import Header from "@/components/Header";
import MeetingBar from "@/components/MeetingBar";
import { bumpCount, type Speaker } from "@/lib/meeting";
import { useRequireMeeting } from "@/lib/use-meeting";

export default function AhCounterPage() {
  const { meeting, speakers, ready, configured, patchSpeaker, runMutation } =
    useRequireMeeting("/ah-counter");

  function bump(speaker: Speaker, field: "filler" | "wod", delta: number) {
    const key = field === "filler" ? "filler_count" : "wod_count";
    const next = Math.max(0, speaker[key] + delta);
    if (next === speaker[key]) return;
    // Show the tap instantly; the server applies it atomically.
    patchSpeaker(speaker.id, { [key]: next });
    void runMutation(() => bumpCount(speaker.id, field, delta));
  }

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

  return (
    <>
      <Header />
      <MeetingBar clubName={meeting.club_name} code={meeting.code} />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex max-w-[644px] flex-col gap-1 text-center">
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
            Ah &amp; Word of the Day Counter
          </h1>
          <p className="text-[18px] leading-[1.4]">
            Words can be tricky little habits. Keep track of filler words like
            &ldquo;um,&rdquo; &ldquo;uh,&rdquo; and &ldquo;like,&rdquo; while also
            monitoring who successfully uses the Word of the Day during the meeting.
          </p>
        </div>

        {speakers.length === 0 ? (
          <div className="flex max-w-[480px] flex-col items-center gap-2 text-center">
            <p className="text-[18px] font-semibold text-brand-dark-1">
              Waiting for the Timer to add the speakers...
            </p>
            <p className="text-[15px] text-brand-dark-3">
              Names appear here automatically as soon as they&rsquo;re added &mdash; no need to
              type them again.
            </p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {speakers.map((s) => (
              <div
                key={s.id}
                className="flex flex-col items-center gap-6 rounded-lg border border-brand-blue px-5 py-8"
              >
                <div className="flex flex-col items-center gap-0 text-center">
                  <p className="text-[24px] font-extrabold">{s.name}</p>
                  <p className="brand-gradient-text text-[18px] font-medium">{s.role}</p>
                </div>
                <div className="flex w-full flex-col gap-4 px-5">
                  <CounterRow
                    label="Filler"
                    value={s.filler_count}
                    onMinus={() => bump(s, "filler", -1)}
                    onPlus={() => bump(s, "filler", 1)}
                  />
                  <CounterRow
                    label="WoD"
                    value={s.wod_count}
                    onMinus={() => bump(s, "wod", -1)}
                    onPlus={() => bump(s, "wod", 1)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function CounterRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-[18px] font-semibold text-brand-dark-1">{label}</span>
      <div className="flex h-[44px] items-center overflow-hidden rounded-full border border-black/25">
        <button
          onClick={onMinus}
          className="flex h-full w-[44px] items-center justify-center text-[20px] font-bold text-brand-dark-1"
        >
          −
        </button>
        <span className="flex h-full w-[54px] items-center justify-center border-x border-black/25 text-[20px] font-extrabold text-brand-dark-1">
          {value}
        </span>
        <button
          onClick={onPlus}
          className="flex h-full w-[44px] items-center justify-center bg-[#f94444] text-[20px] font-bold text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}
