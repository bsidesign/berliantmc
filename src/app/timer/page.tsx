"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { TIMER_CATEGORIES, formatTime } from "@/lib/timer-categories";

type SummaryRow = {
  id: string;
  name: string;
  category: string;
  time: string;
  note: string;
};

export default function TimerPage() {
  const [categoryId, setCategoryId] = useState(TIMER_CATEGORIES[0].id);
  const category = useMemo(
    () => TIMER_CATEGORIES.find((c) => c.id === categoryId)!,
    [categoryId]
  );

  const [remaining, setRemaining] = useState(category.red);
  const [running, setRunning] = useState(false);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function selectCategory(next: (typeof TIMER_CATEGORIES)[number]) {
    setCategoryId(next.id);
    setRunning(false);
    setRemaining(next.red);
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => r - 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const elapsed = category.red - remaining;
  const zone =
    elapsed < category.green
      ? "neutral"
      : elapsed < category.yellow
        ? "green"
        : elapsed < category.red
          ? "yellow"
          : "red";

  const zoneStyles: Record<string, string> = {
    neutral: "bg-white text-brand-dark-1",
    green: "bg-[#14c801] text-white",
    yellow: "bg-[#f5c518] text-brand-dark-1",
    red: "bg-[#f94444] text-white",
  };

  const progressPct = Math.min(100, Math.max(0, (elapsed / category.red) * 100));

  function handleReset() {
    setRunning(false);
    setRemaining(category.red);
  }

  function handleSave() {
    setRows((prev) => [
      {
        id: crypto.randomUUID(),
        name: name.trim() || "Unnamed speaker",
        category: category.label,
        time: formatTime(elapsed),
        note: zone === "red" ? "Over time" : zone === "yellow" ? "Wrap up" : "On time",
      },
      ...prev,
    ]);
    setName("");
    handleReset();
  }

  return (
    <>
      <Header section="Timer" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-8 px-6 py-16">
        <div className="flex max-w-[730px] flex-col gap-1 text-center">
          <h1 className="text-[32px] font-semibold leading-tight sm:text-[42px]">Timer</h1>
          <p className="text-[18px] leading-[1.4]">
            Timing is all about keeping the meeting on track. Set the speaking time, start
            the clock, and use visual signals to let speakers know when they&rsquo;re
            approaching or exceeding their time limit.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {TIMER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCategory(c)}
              className={`rounded-full border border-brand-blue px-4 py-3.5 text-[21px] font-semibold transition-colors ${
                c.id === categoryId ? "brand-gradient text-white" : "text-brand-dark-1"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div
          className={`flex w-full max-w-[758px] flex-col items-center gap-4 rounded-2xl py-10 transition-colors ${zoneStyles[zone]}`}
        >
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
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-2 rounded-lg bg-[#14c801] px-6 py-3.5 text-[16px] font-semibold text-white"
            >
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? "Pause" : "Start"}
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

        <div className="flex w-full max-w-[643px] items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[21px] font-semibold">Toastmaster&rsquo;s Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: Lord Doni ..."
              className="h-[50px] rounded-lg border border-black/25 px-4 text-[18px] outline-none focus:border-brand-blue"
            />
          </div>
          <button
            onClick={handleSave}
            className="h-[50px] rounded-lg border border-black/25 px-6 text-[16px] font-semibold text-brand-dark-2"
          >
            Save
          </button>
        </div>

        <section className="w-full rounded-lg py-8 brand-gradient">
          <h2 className="mb-6 text-center text-[32px] font-semibold text-white sm:text-[42px]">
            Timer Summary
          </h2>
          <div className="mx-auto w-[92%] overflow-x-auto rounded-lg border border-brand-dark-4">
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
    </>
  );
}
