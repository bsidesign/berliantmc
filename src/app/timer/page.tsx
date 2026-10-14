"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Play, Square, Trash2, X, ChevronDown, Plus, UserRound } from "lucide-react";
import Header from "@/components/Header";
import MeetingBar from "@/components/MeetingBar";
import { TIMER_CATEGORIES, type TimerCategory, formatTime } from "@/lib/timer-categories";
import {
  SPEAKER_ROLES,
  addSpeaker,
  clearTiming,
  removeSpeaker,
  roleDef,
  saveTiming,
} from "@/lib/meeting";
import { useRequireMeeting } from "@/lib/use-meeting";

type Mode = "idle" | "running" | "saving";
type Zone = "white" | "green" | "yellow" | "red" | "black";
type Confirm = { kind: "time" | "speaker"; id: string } | null;

function zoneFor(elapsed: number, category: TimerCategory): Zone {
  if (elapsed < category.green) return "white";
  if (elapsed < category.yellow) return "green";
  if (elapsed < category.red) return "yellow";
  if (elapsed < category.black) return "red";
  return "black";
}

const ZONE_STYLES: Record<Zone, string> = {
  white: "bg-white text-brand-dark-1",
  green: "bg-[#14c801] text-white",
  yellow: "bg-[#f5c518] text-brand-dark-1",
  red: "bg-[#f94444] text-white",
  black: "bg-black text-white",
};

const ZONE_NOTES: Record<Zone, string> = {
  white: "Under minimum time",
  green: "On time",
  yellow: "Wrap up",
  red: "Over time",
  black: "Not eligible to vote",
};

const fieldClass =
  "h-[50px] rounded-lg border border-black/25 px-4 text-[16px] outline-none focus:border-brand-blue";

/**
 * Big clock text that always fills 80% of the screen width, so the speaker can
 * read it from across the room. It measures itself (digits are tabular, so the
 * width only changes when a minus sign appears) and sets the font size directly.
 */
function FitTime({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    function fit() {
      if (!el) return;
      el.style.fontSize = "100px";
      const natural = el.getBoundingClientRect().width;
      if (!natural) return;
      const target = document.documentElement.clientWidth * 0.8;
      el.style.fontSize = `${(100 * target) / natural}px`;
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text.length]);

  return (
    <span ref={ref} className="inline-block whitespace-nowrap font-semibold leading-none tabular-nums">
      {text}
    </span>
  );
}

function categoryForRole(role: string): TimerCategory | undefined {
  const id = roleDef(role)?.timerCategoryId;
  return id ? TIMER_CATEGORIES.find((c) => c.id === id) : undefined;
}

export default function TimerPage() {
  const { meeting, speakers, ready, configured, runMutation } = useRequireMeeting("/timer");

  const [remaining, setRemaining] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [finalElapsed, setFinalElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Which speaker is being timed, and the "add a speaker" form.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveForId, setSaveForId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState(SPEAKER_ROLES[0].label);
  const [formError, setFormError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const selected = speakers.find((s) => s.id === selectedId) ?? null;
  // The timing rules come from the chosen speaker's role: no tabs to pick.
  const category = (selected && categoryForRole(selected.role)) || TIMER_CATEGORIES[0];

  function selectSpeaker(id: string) {
    if (mode !== "idle") return;
    setSelectedId(id);
    setStartError(null);
  }

  useEffect(() => {
    if (mode === "running") {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => r - 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode]);

  // While idle the clock always shows the full time for the chosen speaker.
  const shownRemaining = mode === "idle" ? category.red : remaining;
  const elapsed = category.red - shownRemaining;
  const progressPct = Math.min(100, Math.max(0, (elapsed / category.red) * 100));

  // A speaker who already has a recorded time can't be started again until
  // that time is cleared (trash icon in the table).
  const alreadyTimed = selected !== null && selected.speech_seconds !== null;

  function handleStart() {
    if (!selected) {
      setStartError("Choose who is speaking first.");
      return;
    }
    if (alreadyTimed) return;
    setStartError(null);
    setRemaining(category.red);
    setMode("running");
  }

  function handleStop() {
    setFinalElapsed(elapsed);
    setSaveForId(selectedId);
    setMode("saving");
  }

  function handleReset() {
    setMode("idle");
  }

  async function handleSaveTime() {
    const target = speakers.find((s) => s.id === saveForId);
    if (!target) return;
    const targetCategory = categoryForRole(target.role) ?? category;
    const finalZone = zoneFor(finalElapsed, targetCategory);
    await runMutation(() =>
      saveTiming(
        target.id,
        finalElapsed,
        targetCategory.id,
        ZONE_NOTES[finalZone],
        finalZone !== "black"
      )
    );
    setSelectedId(null);
    handleReset();
  }

  async function handleAddSpeaker() {
    if (!meeting) return;
    const name = newName.trim();
    if (!name) {
      setFormError("Please enter the speaker's name.");
      return;
    }
    const max = roleDef(newRole)?.max ?? Infinity;
    if (speakers.filter((s) => s.role === newRole).length >= max) {
      setFormError(
        `${newRole} already has the maximum of ${max} role taker${max === 1 ? "" : "s"}.`
      );
      return;
    }
    const { error } = await runMutation(() => addSpeaker(meeting.id, name, newRole));
    if (error) {
      setFormError(`Could not add speaker: ${error.message}`);
      return;
    }
    setNewName("");
    setFormError(null);
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { kind, id } = confirm;
    setConfirm(null);
    if (kind === "time") {
      await runMutation(() => clearTiming(id));
    } else {
      if (selectedId === id) setSelectedId(null);
      await runMutation(() => removeSpeaker(id));
    }
  }

  const zone = zoneFor(elapsed, category);
  const confirmTarget = speakers.find((s) => s.id === confirm?.id) ?? null;
  const timableSpeakers = speakers.filter((s) => categoryForRole(s.role));

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
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-8 px-6 py-12">
        <div className="flex max-w-[730px] flex-col gap-1 text-center">
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">Timer</h1>
          <p className="text-[18px] leading-[1.4]">
            Add today&rsquo;s speakers once &mdash; every other role sees the list on their own
            device. Select who is speaking, start the clock, and use the visual signals to keep
            them on time.
          </p>
        </div>

        <div className="grid w-full items-start gap-8 lg:grid-cols-2">
          {/* Left: shared speaker list + times */}
          <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-brand-dark-4 p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[21px] font-extrabold">Speakers</h2>
              <p className="text-[14px] text-brand-dark-3">
                Shared live with the Ah &amp; WoD Counter and Ballot Counter.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddSpeaker();
                }}
                placeholder="Example: Lord Doni ..."
                className={`${fieldClass} w-full`}
              />
              <div className="flex gap-3">
                <div className="relative min-w-0 flex-1">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className={`${fieldClass} w-full appearance-none pr-10 text-brand-dark-1`}
                  >
                    {SPEAKER_ROLES.map((r) => (
                      <option key={r.label} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark-1"
                  />
                </div>
                <button
                  onClick={handleAddSpeaker}
                  className="flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-lg brand-gradient px-5 text-[14px] font-semibold text-white"
                >
                  <Plus size={18} /> Add
                </button>
              </div>
              {formError && (
                <p className="text-[14px] font-medium text-[#f94444]">{formError}</p>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-brand-dark-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-blue/5 uppercase text-brand-dark-3">
                    <th className="w-10 p-2 text-[12px] font-semibold sm:w-12 sm:p-3" aria-label="Select" />
                    <th className="p-2 text-[12px] font-semibold sm:p-3">Name &amp; Role</th>
                    <th className="p-2 text-[12px] font-semibold sm:p-3">Time</th>
                    <th className="w-[60px] p-2 text-right text-[12px] font-semibold sm:w-[72px] sm:p-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {speakers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[15px] text-brand-dark-3">
                        No speakers added yet.
                      </td>
                    </tr>
                  ) : (
                    speakers.map((s) => {
                      const canTime = Boolean(categoryForRole(s.role));
                      const isSelected = s.id === selectedId;
                      const timed = s.speech_seconds !== null;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => canTime && selectSpeaker(s.id)}
                          className={`border-t border-brand-dark-4 ${
                            canTime ? "cursor-pointer" : ""
                          } ${isSelected ? "bg-brand-blue/10" : ""}`}
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="radio"
                              name="timer-speaker"
                              checked={isSelected}
                              disabled={!canTime || mode !== "idle"}
                              onChange={() => selectSpeaker(s.id)}
                              aria-label={`Time ${s.name}`}
                              className="size-5 accent-[#2182c3] disabled:opacity-30"
                            />
                          </td>
                          <td className="p-2 sm:p-3">
                            <p className="text-[16px] font-semibold leading-tight">{s.name}</p>
                            <p className="text-[13px] text-brand-dark-3">
                              {s.role}
                              {!canTime && " · not timed"}
                            </p>
                          </td>
                          <td className="p-2 sm:p-3">
                            {timed ? (
                              <>
                                <p className="text-[16px] font-semibold tabular-nums">
                                  {formatTime(s.speech_seconds ?? 0)}
                                </p>
                                <p className="text-[13px] text-brand-dark-3">{s.timer_note}</p>
                              </>
                            ) : (
                              <span className="text-brand-dark-3">&mdash;</span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3">
                            <div className="flex items-center justify-end gap-2">
                              {timed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirm({ kind: "time", id: s.id });
                                  }}
                                  aria-label={`Clear ${s.name}'s time`}
                                  title="Clear time"
                                  className="text-brand-dark-3 hover:text-brand-dark-1"
                                >
                                  <Trash2 size={17} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirm({ kind: "speaker", id: s.id });
                                }}
                                aria-label={`Remove ${s.name}`}
                                title="Remove speaker"
                                className="text-brand-dark-3 hover:text-[#f94444]"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: the clock */}
          <div className="flex min-w-0 flex-col items-center gap-4 rounded-2xl border border-brand-dark-4 bg-white px-4 py-10 text-brand-dark-1 lg:sticky lg:top-6">
            <p className="flex items-center gap-2 text-[16px] text-brand-dark-3">
              <UserRound size={16} />
              {selected ? (
                <>
                  Now timing{" "}
                  <span className="font-semibold text-brand-dark-1">{selected.name}</span>
                </>
              ) : (
                "Select a speaker to start timing"
              )}
            </p>
            {selected && (
              <p className="text-[14px] font-semibold uppercase tracking-wide text-brand-blue">
                {category.label}
              </p>
            )}
            <p className="text-[88px] font-semibold leading-none tabular-nums sm:text-[130px]">
              {formatTime(shownRemaining)}
            </p>
            <div className="h-[13px] w-[90%] max-w-[480px] overflow-hidden rounded-lg border border-black/20 bg-white/60">
              <div
                className="h-full brand-gradient transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <button
              onClick={handleStart}
              disabled={alreadyTimed}
              className="flex items-center gap-2 rounded-lg bg-[#14c801] px-6 py-3.5 text-[16px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/40"
            >
              <Play size={18} />
              Start
            </button>
            {alreadyTimed && (
              <p className="max-w-[320px] text-center text-[14px] text-brand-dark-3">
                {selected?.name} has already been timed. Clear their time in the table to time
                them again.
              </p>
            )}
            {startError && (
              <p className="text-[14px] font-medium text-[#f94444]">{startError}</p>
            )}
          </div>
        </div>
      </main>

      {(mode === "running" || mode === "saving") && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 transition-colors ${ZONE_STYLES[zone]}`}
        >
          {mode === "running" && (
            <button
              onClick={handleReset}
              aria-label="Exit without saving"
              className="absolute right-6 top-6 rounded-full border border-current p-2 opacity-70 hover:opacity-100"
            >
              <X size={22} />
            </button>
          )}

          <p className="text-[18px] font-semibold uppercase tracking-wide opacity-80">
            {selected ? `${selected.name} · ` : ""}
            {category.label}
          </p>
          <FitTime text={formatTime(mode === "saving" ? finalElapsed : remaining)} />

          {mode === "running" && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-lg bg-[#f94444] px-10 py-4 text-[20px] font-semibold text-white"
            >
              <Square size={20} fill="white" />
              Stop
            </button>
          )}

          {mode === "saving" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6">
              <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl bg-white p-8 text-brand-dark-1">
                <h3 className="text-[24px] font-extrabold">Save This Time?</h3>
                <p className="text-[15px] text-brand-dark-3">
                  Time: {formatTime(finalElapsed)} &middot; {category.label} &middot;{" "}
                  {ZONE_NOTES[zoneFor(finalElapsed, category)]}
                </p>
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-semibold">Who just spoke?</label>
                  <div className="relative">
                    <select
                      value={saveForId ?? ""}
                      onChange={(e) => setSaveForId(e.target.value)}
                      className={`${fieldClass} w-full appearance-none pr-10`}
                    >
                      {timableSpeakers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-black/25 px-5 py-3 text-[15px] font-semibold text-brand-dark-2"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveTime}
                    disabled={!saveForId}
                    className="rounded-lg brand-gradient px-6 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
                  >
                    Add to Summary
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {confirm && confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-2xl bg-white p-8 text-center text-brand-dark-1">
            <h3 className="text-[21px] font-extrabold">
              {confirm.kind === "time" ? "Clear This Time?" : "Remove This Speaker?"}
            </h3>
            <p className="text-[15px] text-brand-dark-3">
              {confirm.kind === "time" ? (
                <>
                  Remove <span className="font-semibold text-brand-dark-1">{confirmTarget.name}</span>
                  &rsquo;s recorded time. They stay on the speaker list.
                </>
              ) : (
                <>
                  <span className="font-semibold text-brand-dark-1">{confirmTarget.name}</span> will
                  disappear from every role&rsquo;s screen, along with their time and counts.
                </>
              )}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-black/25 px-6 py-3 text-[15px] font-semibold text-brand-dark-2"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-[#f94444] px-6 py-3 text-[15px] font-semibold text-white"
              >
                {confirm.kind === "time" ? "Clear" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
