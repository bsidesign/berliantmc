"use client";

import { useState } from "react";
import { ChevronDown, UserPlus } from "lucide-react";
import Header from "@/components/Header";

const ROLES = [
  "TOM",
  "Prepared Speech",
  "Evaluator",
  "Table Topic Speaker",
  "Ah & WoD Counter",
  "Grammarian",
  "Timer",
  "General Evaluator",
];

// Maximum number of role takers allowed per role in a single meeting.
const ROLE_MAX: Record<string, number> = {
  TOM: 1,
  "Prepared Speech": 5,
  Evaluator: 5,
  "Table Topic Speaker": 10,
  "Ah & WoD Counter": 1,
  Grammarian: 1,
  Timer: 1,
  "General Evaluator": 1,
};

type Speaker = {
  id: string;
  name: string;
  role: string;
  filler: number;
  wod: number;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function AhCounterPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addSpeaker() {
    if (!name.trim() && !role) {
      setError("Please enter a name and choose a role.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter the Toastmaster's name.");
      return;
    }
    if (!role) {
      setError("Please choose a role.");
      return;
    }

    const max = ROLE_MAX[role] ?? Infinity;
    const currentCount = speakers.filter((s) => s.role === role).length;
    if (currentCount >= max) {
      setError(
        `${role} already has the maximum of ${max} role taker${max === 1 ? "" : "s"}.`
      );
      return;
    }

    setError(null);
    setSpeakers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), role, filler: 0, wod: 0 },
    ]);
    setName("");
    setRole("");
  }

  function bump(id: string, field: "filler" | "wod", delta: number) {
    setSpeakers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [field]: Math.max(0, s[field] + delta) } : s
      )
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex max-w-[644px] flex-col gap-1 text-center">
          <h1 className="text-[32px] font-semibold leading-tight sm:text-[42px]">
            Ah &amp; Word of the Day Counter
          </h1>
          <p className="text-[18px] leading-[1.4]">
            Words can be tricky little habits. Keep track of filler words like
            &ldquo;um,&rdquo; &ldquo;uh,&rdquo; and &ldquo;like,&rdquo; while also
            monitoring who successfully uses the Word of the Day during the meeting.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[21px] font-semibold">Toastmaster&rsquo;s Name</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Example: Lord Doni ..."
                className="h-[50px] w-[280px] rounded-lg border border-black/25 px-4 text-[18px] outline-none focus:border-brand-blue"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[21px] font-semibold">Role</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setError(null);
                  }}
                  className="h-[50px] w-[220px] appearance-none rounded-lg border border-black/25 py-0 pl-4 pr-10 text-[18px] text-brand-dark-1/70 outline-none focus:border-brand-blue"
                >
                  <option value="">Choose Role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark-1/70"
                />
              </div>
            </div>
            <button
              onClick={addSpeaker}
              className="flex h-[50px] items-center gap-2 rounded-lg brand-gradient px-5 text-[13px] font-semibold text-white"
            >
              <UserPlus size={18} /> Add Speaker
            </button>
          </div>
          {error && <p className="text-[15px] font-medium text-[#f94444]">{error}</p>}
        </div>

        {speakers.length === 0 ? (
          <p className="text-brand-dark-3">No speakers added yet.</p>
        ) : (
          <div className="flex w-full flex-wrap justify-center gap-7">
            {speakers.map((s) => (
              <div
                key={s.id}
                className="flex w-[382px] flex-col items-center gap-6 rounded-lg border border-brand-blue px-5 py-8"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full brand-gradient text-[24px] font-semibold text-white">
                    {initials(s.name)}
                  </span>
                  <p className="text-[24px] font-semibold">{s.name}</p>
                  <p className="brand-gradient-text text-[21px] font-medium">{s.role}</p>
                </div>
                <div className="flex w-full flex-col gap-4 px-5">
                  <CounterRow
                    label="Filler"
                    value={s.filler}
                    onMinus={() => bump(s.id, "filler", -1)}
                    onPlus={() => bump(s.id, "filler", 1)}
                  />
                  <CounterRow
                    label="WoD"
                    value={s.wod}
                    onMinus={() => bump(s.id, "wod", -1)}
                    onPlus={() => bump(s.id, "wod", 1)}
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
    <div className="flex w-full items-center justify-center gap-4">
      <span className="w-[50px] text-[18px] font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onMinus}
          className="flex h-[50px] w-[55px] items-center justify-center rounded-lg border border-black/30 text-[28px] font-semibold"
        >
          −
        </button>
        <span className="w-[50px] text-center text-[33px] font-semibold">{value}</span>
        <button
          onClick={onPlus}
          className="flex h-[50px] w-[55px] items-center justify-center rounded-lg text-[28px] font-semibold text-white"
          style={{
            backgroundImage:
              "linear-gradient(150deg, rgb(249,68,68) 6%, rgb(111,0,0) 128%)",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}