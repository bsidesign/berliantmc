"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Trash2, X, ChevronDown, Plus, Check, UserRound } from "lucide-react";
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

export default function TimerPage() {
  const { meeting, speakers, ready, configured, runMutation } = useRequireMeeting("/timer");

  const [categoryId, setCategoryId] = useState(TIMER_CATEGORIES[0].id);
  const category = useMemo(
    () => TIMER_CATEGORIES.find((c) => c.id === categoryId)!,
    [categoryId]
  );

  const [remaining, setRemaining] = useState(category.red);
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

  function selectCategory(next: TimerCategory) {
    setCategoryId(next.id);
    setMode("idle");
    setRemaining(next.red);
  }

  function selectSpeaker(id: string) {
    if (mode !== "idle") return;
    setSelectedId(id);
    setStartError(null);
    // Each role has its own timing rules, so switch the lights automatically.
    const speaker = speakers.find((s) => s.id === id);
    const wanted = speaker ? roleDef(speaker.role)?.timerCategoryId : undefined;
    const next = wanted ? TIMER_CATEGORIES.find((c) => c.id === wanted) : undefined;
    if (next) selectCategory(next);
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

  const elapsed = category.red - remaining;
  const zone = zoneFor(elapsed, category);
  const progressPct = Math.min(100, Math.max(0, (elapsed / category.red) * 100));
  const selected = speakers.find((s) => s.id === selectedId) ?? null;

  function handleStart() {
    if (!selected) {
      setStartError("Choose who is speaking first.");
      return;
    }
    setStartError(null);
    setMode("running");
  }

  function handleStop() {
    setFinalElapsed(elapsed);
    setSaveForId(selectedId);
    setMode("saving");
  }

  function handleReset() {
    setMode("idle");
    setRemaining(category.red);
  }

  async function handleSaveTime() {
    const target = speakers.find((s) => s.id === saveForId);
    if (!target) return;
    const finalZone = zoneFor(finalElapsed, category);
    await runMutation(() =>
      saveTiming(
        target.id,
        finalElapsed,
        category.id,
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

  const timedRows = speakers.filter((s) => s.speech_seconds !== null);
  const confirmTarget = speakers.find((s) => s.id === confirm?.id) ?? null;

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
      <main className="flex flex-1 flex-col items-center">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-6 pt-16 pb-16">
          <div className="flex max-w-[730px] flex-col gap-1 text-center">
            <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">Timer</h1>
            <p className="text-[18px] leading-[1.4]">
              Add today&rsquo;s speakers once &mdash; every other role sees the list on their own
              device. Then pick who is speaking, start the clock, and use the visual signals to
              keep them on time.
            </p>
          </div>

          {/* Shared speaker list */}
          <div className="flex w-full max-w-[800px] flex-col gap-4 rounded-2xl border border-brand-dark-4 p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[21px] font-extrabold">Speakers</h2>
              <p className="text-[14px] text-brand-dark-3">
                Shared live with the Ah &amp; WoD Counter and Ballot Counter.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
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
                className={`${fieldClass} flex-1`}
              />
              <div className="relative sm:w-[220px]">
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
                className="flex h-[50px] items-center justify-center gap-2 rounded-lg brand-gradient px-5 text-[14px] font-semibold text-white"
              >
                <Plus size={18} /> Add
              </button>
            </div>
            {formError && <p className="text-[14px] font-medium text-[#f94444]">{formError}</p>}

            {speakers.length === 0 ? (
              <p className="text-[15px] text-brand-dark-3">No speakers added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {speakers.map((s) => {
                  const isSelected = s.id === selectedId;
                  const timed = s.speech_seconds !== null;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center overflow-hidden rounded-full border text-[14px] ${
                        isSelected
                          ? "brand-gradient border-transparent text-white"
                          : "border-brand-blue text-brand-dark-1"
                      }`}
                    >
                      <button
                        onClick={() => selectSpeaker(s.id)}
                        className="flex items-center gap-2 py-2 pl-4 pr-2 text-left"
                      >
                        <span className="font-semibold">{s.name}</span>
                        <span className={isSelected ? "opacity-80" : "text-brand-dark-3"}>
                          {s.role}
                        </span>
                        {timed && <Check size={14} className={isSelected ? "" : "text-[#14c801]"} />}
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: "speaker", id: s.id })}
                        aria-label={`Remove ${s.name}`}
                        className="py-2 pl-1 pr-3 opacity-60 hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden flex-wrap justify-center gap-4 sm:flex">
            {TIMER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCategory(c)}
                className={`rounded-full border border-brand-blue px-4 py-2 text-[18px] font-semibold transition-colors ${
                  c.id === categoryId ? "brand-gradient text-white" : "text-brand-dark-1"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-[320px] sm:hidden">
            <select
              value={categoryId}
              onChange={(e) => {
                const next = TIMER_CATEGORIES.find((c) => c.id === e.target.value);
                if (next) selectCategory(next);
              }}
              className="h-[50px] w-full appearance-none rounded-lg border border-brand-blue px-4 pr-10 text-[18px] font-semibold text-brand-dark-1 outline-none focus:border-brand-blue"
            >
              {TIMER_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark-1"
            />
          </div>

          <div className="flex w-full max-w-[800px] flex-col items-center gap-4 rounded-2xl border border-brand-dark-4 bg-white py-10 text-brand-dark-1">
            <p className="flex items-center gap-2 text-[16px] text-brand-dark-3">
              <UserRound size={16} />
              {selected ? (
                <>
                  Now timing{" "}
                  <span className="font-semibold text-brand-dark-1">{selected.name}</span>
                </>
              ) : (
                "Pick a speaker above to start timing"
              )}
            </p>
            <p className="text-[96px] font-semibold leading-none tabular-nums sm:text-[160px]">
              {formatTime(remaining)}
            </p>
            <div className="h-[13px] w-[90%] max-w-[586px] overflow-hidden rounded-lg border border-black/20 bg-white/60">
              <div
                className="h-full brand-gradient transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <button
              onClick={handleStart}
              className="flex items-center gap-2 rounded-lg bg-[#14c801] px-6 py-3.5 text-[16px] font-semibold text-white"
            >
              <Play size={18} />
              Start
            </button>
            {startError && (
              <p className="text-[14px] font-medium text-[#f94444]">{startError}</p>
            )}
          </div>
        </div>

        <section className="flex w-full flex-1 flex-col px-6 py-8 brand-gradient sm:px-0">
          <h2 className="mb-6 text-center text-[32px] font-extrabold text-white sm:text-[42px]">
            Timer Summary
          </h2>
          <div className="mx-auto w-full max-w-[800px]">
            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto rounded-lg border border-brand-dark-4 sm:block">
              <table className="w-full min-w-[640px] text-left text-white">
                <thead>
                  <tr className="bg-white/5 uppercase">
                    <th className="p-3.5 text-[14px] font-normal">Toastmaster&rsquo;s Name</th>
                    <th className="p-3.5 text-[14px] font-normal">Speech Category</th>
                    <th className="p-3.5 text-[14px] font-normal">Time</th>
                    <th className="p-3.5 text-[14px] font-normal">Note</th>
                    <th className="p-3.5 text-[14px] font-normal">Clear</th>
                  </tr>
                </thead>
                <tbody>
                  {timedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        No data to display.
                      </td>
                    </tr>
                  ) : (
                    timedRows.map((row) => (
                      <tr key={row.id} className="border-t border-white/20">
                        <td className="p-3.5">{row.name}</td>
                        <td className="p-3.5">
                          {TIMER_CATEGORIES.find((c) => c.id === row.timer_category)?.label ??
                            row.role}
                        </td>
                        <td className="p-3.5">{formatTime(row.speech_seconds ?? 0)}</td>
                        <td className="p-3.5">{row.timer_note}</td>
                        <td className="p-3.5">
                          <button
                            onClick={() => setConfirm({ kind: "time", id: row.id })}
                            aria-label="Clear time"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards, no horizontal scroll needed */}
            <div className="flex flex-col gap-3 sm:hidden">
              {timedRows.length === 0 ? (
                <div className="rounded-lg border border-brand-dark-4 p-8 text-center text-white">
                  No data to display.
                </div>
              ) : (
                timedRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-lg border border-brand-dark-4 bg-white/5 p-4 text-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[16px] font-semibold">{row.name}</p>
                      <button
                        onClick={() => setConfirm({ kind: "time", id: row.id })}
                        aria-label="Clear time"
                        className="shrink-0 text-white/80 hover:text-white"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 text-[14px]">
                      <p>
                        <span className="text-white/60">Speech Category: </span>
                        {TIMER_CATEGORIES.find((c) => c.id === row.timer_category)?.label ??
                          row.role}
                      </p>
                      <p>
                        <span className="text-white/60">Time: </span>
                        {formatTime(row.speech_seconds ?? 0)}
                      </p>
                      <p>
                        <span className="text-white/60">Note: </span>
                        {row.timer_note}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
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
          <p className="text-[120px] font-semibold leading-none tabular-nums sm:text-[220px]">
            {formatTime(mode === "saving" ? finalElapsed : remaining)}
          </p>

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
                      {speakers.map((s) => (
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
