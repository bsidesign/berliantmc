"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, RotateCcw, Trash2, X, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import { TIMER_CATEGORIES, type TimerCategory, formatTime } from "@/lib/timer-categories";

type SummaryRow = {
  id: string;
  name: string;
  category: string;
  time: string;
  note: string;
};

type Mode = "idle" | "running" | "naming";
type Zone = "white" | "green" | "yellow" | "red" | "black";

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

export default function TimerPage() {
  const [categoryId, setCategoryId] = useState(TIMER_CATEGORIES[0].id);
  const category = useMemo(
    () => TIMER_CATEGORIES.find((c) => c.id === categoryId)!,
    [categoryId]
  );

  const [remaining, setRemaining] = useState(category.red);
  const [mode, setMode] = useState<Mode>("idle");
  const [finalElapsed, setFinalElapsed] = useState(0);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function selectCategory(next: TimerCategory) {
    setCategoryId(next.id);
    setMode("idle");
    setRemaining(next.red);
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

  function handleStart() {
    setMode("running");
  }

  function handleStop() {
    setFinalElapsed(elapsed);
    setMode("naming");
  }

  function handleReset() {
    setMode("idle");
    setRemaining(category.red);
  }

  function handleCancelFullscreen() {
    setMode("idle");
    setRemaining(category.red);
  }

  function handleAddSpeaker() {
    const finalZone = zoneFor(finalElapsed, category);
    setRows((prev) => [
      {
        id: crypto.randomUUID(),
        name: name.trim() || "Unnamed speaker",
        category: category.label,
        time: formatTime(finalElapsed),
        note: ZONE_NOTES[finalZone],
      },
      ...prev,
    ]);
    setName("");
    handleReset();
  }

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-6 pt-16 pb-16">
        <div className="flex max-w-[730px] flex-col gap-1 text-center">
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">Timer</h1>
          <p className="text-[18px] leading-[1.4]">
            Timing is all about keeping the meeting on track. Set the speaking time, start
            the clock, and use visual signals to let speakers know when they&rsquo;re
            approaching or exceeding their time limit.
          </p>
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
          <p className="text-[96px] font-semibold leading-none tabular-nums sm:text-[160px]">
            {formatTime(remaining)}
          </p>
          <div className="h-[13px] w-[90%] max-w-[586px] overflow-hidden rounded-lg border border-black/20 bg-white/60">
            <div
              className="h-full brand-gradient transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 rounded-lg bg-[#14c801] px-6 py-3.5 text-[16px] font-semibold text-white"
            >
              <Play size={18} />
              Start
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-current px-6 py-3.5 text-[16px] font-semibold"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
        </div>
        </div>

        <section className="flex w-full flex-1 flex-col px-6 py-8 brand-gradient sm:px-0">
          <h2 className="mb-6 text-center text-[32px] font-extrabold text-white sm:text-[42px]">
            Timer Summary
          </h2>
          <div className="mx-auto w-full max-w-[800px] overflow-x-auto rounded-lg border border-brand-dark-4">
            <table className="w-full min-w-[640px] text-left text-white">
              <thead>
                <tr className="bg-white/5 uppercase">
                  <th className="p-3.5 text-[14px] font-normal">Toastmaster&rsquo;s Name</th>
                  <th className="p-3.5 text-[14px] font-normal">Speech Category</th>
                  <th className="p-3.5 text-[14px] font-normal">Time</th>
                  <th className="p-3.5 text-[14px] font-normal">Note</th>
                  <th className="p-3.5 text-[14px] font-normal">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      No data to display.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-white/20">
                      <td className="p-3.5">{row.name}</td>
                      <td className="p-3.5">{row.category}</td>
                      <td className="p-3.5">{row.time}</td>
                      <td className="p-3.5">{row.note}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() =>
                            setRows((prev) => prev.filter((r) => r.id !== row.id))
                          }
                          aria-label="Delete row"
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
        </section>
      </main>

      {(mode === "running" || mode === "naming") && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 transition-colors ${ZONE_STYLES[zone]}`}
        >
          {mode === "running" && (
            <button
              onClick={handleCancelFullscreen}
              aria-label="Exit without saving"
              className="absolute right-6 top-6 rounded-full border border-current p-2 opacity-70 hover:opacity-100"
            >
              <X size={22} />
            </button>
          )}

          <p className="text-[18px] font-semibold uppercase tracking-wide opacity-80">
            {category.label}
          </p>
          <p className="text-[120px] font-semibold leading-none tabular-nums sm:text-[220px]">
            {formatTime(mode === "naming" ? finalElapsed : remaining)}
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

          {mode === "naming" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6">
              <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl bg-white p-8 text-brand-dark-1">
                <h3 className="text-[24px] font-extrabold">Who Just Spoke?</h3>
                <p className="text-[15px] text-brand-dark-3">
                  Time: {formatTime(finalElapsed)} &middot; {category.label}
                </p>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSpeaker();
                  }}
                  placeholder="Example: Lord Doni ..."
                  className="h-[50px] rounded-lg border border-black/25 px-4 text-[18px] outline-none focus:border-brand-blue"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleAddSpeaker}
                    className="rounded-lg brand-gradient px-6 py-3 text-[15px] font-semibold text-white"
                  >
                    Add to Summary
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}