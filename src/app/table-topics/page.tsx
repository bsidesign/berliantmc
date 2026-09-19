"use client";

import { useState } from "react";
import { PenLine, ImageIcon, Check, ChevronDown, Eye, Maximize2, X } from "lucide-react";
import Header from "@/components/Header";
import { randomTopics } from "@/lib/table-topics-bank";

type Mode = "text" | "image";

const MODES: { id: Mode; label: string; icon: typeof PenLine }[] = [
  { id: "text", label: "Text Based", icon: PenLine },
  { id: "image", label: "Image Based", icon: ImageIcon },
];

export default function TableTopicsPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(5);
  const [topics, setTopics] = useState<string[]>([]);
  const [opened, setOpened] = useState<Set<number>>(new Set());
    const [reveal, setReveal] = useState<number | null>(null);

  function handleGenerate() {
    setTopics(randomTopics(count, theme));
    setOpened(new Set());
  }

  function handleClear() {
    setTopics([]);
    setOpened(new Set());
    setReveal(null);
  }

  // One click both marks the topic opened and shows it fullscreen.
  function openTopic(i: number) {
    setOpened((prev) => new Set(prev).add(i));
    setReveal(i);
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col items-center gap-8 px-6 py-16">
        <div className="flex max-w-[700px] flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
              Table Topics Master
            </h1>
            <p className="text-[18px] leading-[1.4]">
              Table Topics are like impromptu adventures. You get an unexpected question,
              statement, or quote and instantly explore it, sharing your quick thoughts
              with the audience.
            </p>
          </div>

          <div className="hidden gap-4 sm:flex">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-2 rounded-full border border-brand-blue px-4 py-2 text-[18px] font-semibold transition-colors ${
                  mode === id ? "brand-gradient text-white" : ""
                }`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-[320px] sm:hidden">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="h-[50px] w-full appearance-none rounded-lg border border-brand-blue px-4 pr-10 text-[18px] font-semibold text-brand-dark-1 outline-none focus:border-brand-blue"
            >
              {MODES.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark-1"
            />
          </div>
        </div>

        {mode === "image" ? (
          <p className="text-brand-dark-3">
            Image-based topics are coming soon — for now, use Text Based to generate
            prompts.
          </p>
        ) : (
          <div className="flex w-full flex-col items-end gap-4">
            <div className="flex w-full flex-col gap-2">
              <label className="text-[21px] font-semibold">
                Write a theme for the topics (optional)
              </label>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={3}
                placeholder="Example: innovation, leadership, everyday life..."
                className="w-full rounded-lg border border-brand-dark-3 p-4 text-[18px] outline-none focus:border-brand-blue"
              />
            </div>
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[18px]">How many topics?</span>
                <div className="relative">
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="h-[50px] appearance-none rounded-lg border border-black py-0 pl-4 pr-10 text-[16px] font-semibold text-brand-dark-2"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark-2"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                {topics.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/25 px-6 py-3.5 text-[16px] font-semibold text-brand-dark-2 sm:w-auto"
                  >
                    <X size={18} />
                    Clear
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  className="w-full rounded-lg brand-gradient px-6 py-3.5 text-[16px] font-semibold text-white sm:w-auto"
                >
                  Generate Table Topic&rsquo;s
                </button>
              </div>
            </div>
          </div>
        )}

        {topics.length > 0 && (
          <div className="flex w-full flex-col gap-3">
            {topics.map((t, i) => {
              const isOpen = opened.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-4 rounded-lg border p-5 ${
                    isOpen ? "border-brand-dark-4" : "border-brand-blue"
                  }`}
                >
                  {isOpen ? (
                    <>
                      <p className="text-[16px] leading-[1.4]">{t}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <Check className="text-[#14c801]" size={20} />
                        <button
                          onClick={() => setReveal(i)}
                          className="flex items-center gap-2 rounded-lg brand-gradient px-4 py-2.5 text-[14px] font-semibold text-white"
                        >
                          <Maximize2 size={16} /> Present
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[16px] font-semibold text-brand-dark-2">
                        Topic {i + 1}
                      </p>
                      <button
                        onClick={() => openTopic(i)}
                        className="flex shrink-0 items-center gap-2 rounded-lg border border-brand-blue px-4 py-2.5 text-[14px] font-semibold text-brand-blue"
                      >
                        <Eye size={16} /> Open
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {reveal !== null && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center p-10 brand-gradient"
          onClick={() => setReveal(null)}
        >
          <p className="max-w-[900px] text-center text-[32px] font-semibold leading-snug text-white sm:text-[48px]">
            {topics[reveal]}
          </p>
          <span className="absolute bottom-8 text-white/70">
            Tap anywhere to close
          </span>
        </div>
      )}
    </>
  );
}