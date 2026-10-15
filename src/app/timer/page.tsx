"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Play,
  Square,
  Trash2,
  X,
  ChevronDown,
  Plus,
  UserRound,
  SlidersHorizontal,
  BadgeCheck,
  Ban,
} from "lucide-react";
import Header from "@/components/Header";
import MeetingBar from "@/components/MeetingBar";
import { TIMER_CATEGORIES, type TimerCategory, formatTime } from "@/lib/timer-categories";
import {
  type Thresholds,
  resetThresholds,
  saveThresholds,
  useTimerCategories,
  validateThresholds,
} from "@/lib/timer-settings";
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

// Only speakers who finish in the green, yellow or red light can be voted for:
// finishing under the minimum (white) or past the black light is not eligible.
function isEligibleZone(zone: Zone): boolean {
  return zone !== "white" && zone !== "black";
}

const ZONE_NOTES: Record<Zone, string> = {
  white: "Under minimum time, not eligible to vote",
  green: "On time",
  yellow: "Wrap up",
  red: "Over time",
  black: "Not eligible to vote",
};

const ZONE_DOT: Record<Zone, string> = {
  white: "#ffffff",
  green: "#14c801",
  yellow: "#f5c518",
  red: "#f94444",
  black: "#000000",
};

// Wording for the save box (the "black" light means over time).
const ZONE_NOTES_SAVE: Record<Zone, string> = {
  white: "Under minimum time",
  green: "On time",
  yellow: "Wrap up",
  red: "Over time",
  black: "Over time",
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

function categoryForRole(role: string, categories: TimerCategory[]): TimerCategory | undefined {
  const id = roleDef(role)?.timerCategoryId;
  return id ? categories.find((c) => c.id === id) : undefined;
}

// The four light changes, in order, with the wording shown beside each one.
const LIGHTS: { key: keyof Thresholds; label: string; color: string; note: string }[] = [
  { key: "green", label: "Green", color: "#14c801", note: "Minimum time reached" },
  { key: "yellow", label: "Yellow", color: "#f5c518", note: "Wrap up" },
  { key: "red", label: "Red", color: "#f94444", note: "Maximum time" },
  { key: "black", label: "Black", color: "#000000", note: "Over time, not eligible to vote" },
];

type Draft = Record<keyof Thresholds, { m: string; s: string }>;

function toDraft(t: Thresholds): Draft {
  const part = (sec: number) => ({ m: String(Math.floor(sec / 60)), s: String(Math.round(sec % 60)) });
  return { green: part(t.green), yellow: part(t.yellow), red: part(t.red), black: part(t.black) };
}

function fromDraft(d: Draft): Thresholds {
  const sec = (x: { m: string; s: string }) => Number(x.m || 0) * 60 + Number(x.s || 0);
  return { green: sec(d.green), yellow: sec(d.yellow), red: sec(d.red), black: sec(d.black) };
}

export default function TimerPage() {
  const { meeting, speakers, ready, configured, runMutation } = useRequireMeeting("/timer");
  const { categories, isCustomized } = useTimerCategories();

  const [seconds, setSeconds] = useState(0);
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
  const category = (selected && categoryForRole(selected.role, categories)) || categories[0];

  function selectSpeaker(id: string) {
    if (mode !== "idle") return;
    setSelectedId(id);
    setStartError(null);
  }

  useEffect(() => {
    if (mode === "running") {
      intervalRef.current = setInterval(() => {
        setSeconds((n) => n + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode]);

  // The clock counts up from 00:00; while idle it always shows 00:00.
  const elapsed = mode === "idle" ? 0 : seconds;
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
    setSeconds(0);
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
    const targetCategory = categoryForRole(target.role, categories) ?? category;
    const finalZone = zoneFor(finalElapsed, targetCategory);
    await runMutation(() =>
      saveTiming(
        target.id,
        finalElapsed,
        targetCategory.id,
        ZONE_NOTES[finalZone],
        isEligibleZone(finalZone)
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

  // "Customize" editor for the light times.
  const [editing, setEditing] = useState<{ categoryId: string; draft: Draft } | null>(null);

  function openEditor() {
    setEditing({ categoryId: category.id, draft: toDraft(category) });
  }

  function editCategory(categoryId: string) {
    const target = categories.find((c) => c.id === categoryId);
    if (target) setEditing({ categoryId, draft: toDraft(target) });
  }

  function editField(key: keyof Thresholds, unit: "m" | "s", value: string) {
    setEditing((prev) =>
      prev
        ? { ...prev, draft: { ...prev.draft, [key]: { ...prev.draft[key], [unit]: value } } }
        : prev
    );
  }

  const editError = editing ? validateThresholds(fromDraft(editing.draft)) : null;

  function handleSaveSettings() {
    if (!editing || editError) return;
    saveThresholds(editing.categoryId, fromDraft(editing.draft));
    setEditing(null);
  }

  function handleResetSettings() {
    if (!editing) return;
    resetThresholds(editing.categoryId);
    const original = TIMER_CATEGORIES.find((c) => c.id === editing.categoryId);
    if (original) setEditing({ categoryId: original.id, draft: toDraft(original) });
  }

  const zone = zoneFor(elapsed, category);
  const confirmTarget = speakers.find((s) => s.id === confirm?.id) ?? null;
  // Details for the "Save This Time?" box: the speaker is fixed at Stop time.
  const saveTarget = speakers.find((s) => s.id === saveForId) ?? null;
  const saveCategory = (saveTarget && categoryForRole(saveTarget.role, categories)) || category;
  const saveZone = zoneFor(finalElapsed, saveCategory);
  const saveEligible = isEligibleZone(saveZone);
  const saveHasVote = Boolean(saveTarget && roleDef(saveTarget.role)?.ballotCategory);

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
                      const canTime = Boolean(categoryForRole(s.role, categories));
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
              {formatTime(elapsed)}
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

            <div className="mt-2 flex w-[90%] max-w-[480px] flex-col gap-3 border-t border-brand-dark-4 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="text-[16px] font-extrabold">Timing lights</p>
                  <span className="text-[14px] text-brand-dark-3">{category.label}</span>
                  {isCustomized(category.id) && (
                    <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[12px] font-semibold text-brand-blue">
                      Customized
                    </span>
                  )}
                </div>
                <button
                  onClick={openEditor}
                  className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-brand-blue"
                >
                  <SlidersHorizontal size={15} /> Customize
                </button>
              </div>
              <ul className="flex flex-col gap-2.5">
                <li className="flex items-center gap-3 text-[14px]">
                  <span className="size-4 shrink-0 rounded-full border border-black/30 bg-white" />
                  <span className="font-semibold">White</span>
                  <span className="text-brand-dark-3">Starts at 00:00, under minimum time, not eligible to vote</span>
                </li>
                {LIGHTS.map((l) => (
                  <li key={l.key} className="flex items-center gap-3 text-[14px]">
                    <span
                      className="size-4 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="w-[52px] shrink-0 font-semibold">{l.label}</span>
                    <span className="w-[52px] shrink-0 font-semibold tabular-nums">
                      {formatTime(category[l.key])}
                    </span>
                    <span className="min-w-0 text-brand-dark-3">{l.note}</span>
                  </li>
                ))}
              </ul>
            </div>
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
          <FitTime text={formatTime(elapsed)} />

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
              <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-2xl bg-white p-8 text-brand-dark-1">
                <h3 className="text-[24px] font-extrabold">Save This Time?</h3>

                {saveTarget ? (
                  <div className="flex flex-col gap-4 rounded-xl border border-brand-dark-4 p-5">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-dark-3">
                        This is
                      </p>
                      <p className="text-[24px] font-extrabold leading-tight">{saveTarget.name}</p>
                      <p className="text-[15px] text-brand-dark-3">{saveTarget.role}</p>
                    </div>

                    <div className="flex items-end justify-between gap-4 border-t border-brand-dark-4 pt-4">
                      <div className="flex flex-col">
                        <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-dark-3">
                          Time
                        </p>
                        <p className="text-[40px] font-semibold leading-none tabular-nums">
                          {formatTime(finalElapsed)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <p className="text-[14px] font-semibold">{saveCategory.label}</p>
                        <p className="flex items-center gap-2 text-[14px] text-brand-dark-3">
                          <span
                            className="size-3 rounded-full border border-black/20"
                            style={{ backgroundColor: ZONE_DOT[saveZone] }}
                          />
                          {ZONE_NOTES_SAVE[saveZone]}
                        </p>
                      </div>
                    </div>

                    {saveHasVote ? (
                      <span
                        className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-semibold ${
                          saveEligible
                            ? "bg-[#14c801]/15 text-[#0b7a00]"
                            : "bg-[#f94444]/15 text-[#c42323]"
                        }`}
                      >
                        {saveEligible ? <BadgeCheck size={18} /> : <Ban size={18} />}
                        {saveEligible ? "Eligible to vote" : "Not eligible to vote"}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center rounded-lg bg-black/5 px-4 py-2.5 text-[15px] font-semibold text-brand-dark-3">
                        No voting for this role
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[15px] text-brand-dark-3">
                    This speaker was removed from the list, so the time can&rsquo;t be saved.
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-black/25 px-5 py-3 text-[15px] font-semibold text-brand-dark-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTime}
                    disabled={!saveTarget}
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-6">
          <div className="flex w-full max-w-[460px] flex-col gap-5 rounded-2xl bg-white p-8 text-brand-dark-1">
            <div className="flex flex-col gap-1">
              <h3 className="text-[24px] font-extrabold">Customize Timing Lights</h3>
              <p className="text-[14px] text-brand-dark-3">
                Set the time (minutes and seconds) when each light turns on. Saved on this device
                and used for every meeting.
              </p>
            </div>

            <div className="relative">
              <select
                value={editing.categoryId}
                onChange={(e) => editCategory(e.target.value)}
                className={`${fieldClass} w-full appearance-none pr-10 font-semibold`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
              />
            </div>

            <div className="flex flex-col gap-3">
              {LIGHTS.map((l) => (
                <div key={l.key} className="flex items-center gap-3">
                  <span
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="w-[60px] shrink-0 text-[15px] font-semibold">{l.label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={editing.draft[l.key].m}
                    onChange={(e) => editField(l.key, "m", e.target.value)}
                    aria-label={`${l.label} minutes`}
                    className={`${fieldClass} h-[44px] w-[72px] px-3 text-center tabular-nums`}
                  />
                  <span className="text-[14px] text-brand-dark-3">min</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={editing.draft[l.key].s}
                    onChange={(e) => editField(l.key, "s", e.target.value)}
                    aria-label={`${l.label} seconds`}
                    className={`${fieldClass} h-[44px] w-[72px] px-3 text-center tabular-nums`}
                  />
                  <span className="text-[14px] text-brand-dark-3">sec</span>
                </div>
              ))}
            </div>

            {editError && <p className="text-[14px] font-medium text-[#f94444]">{editError}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleResetSettings}
                className="text-[14px] font-semibold text-brand-blue"
              >
                Reset to default
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-black/25 px-5 py-3 text-[15px] font-semibold text-brand-dark-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={Boolean(editError)}
                  className="rounded-lg brand-gradient px-6 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
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
