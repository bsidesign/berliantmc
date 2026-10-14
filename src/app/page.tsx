"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import Header from "@/components/Header";
import RoleCard from "@/components/RoleCard";
import InviteScreen from "@/components/InviteScreen";
import { TOOLS } from "@/lib/tools";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createMeeting, fetchMeetingByCode } from "@/lib/meeting";
import {
  clearActiveMeeting,
  hasResumed,
  markResumed,
  setActiveMeeting,
  useActiveMeeting,
  useHydrated,
} from "@/lib/active-meeting";
import { useMeetingData } from "@/lib/use-meeting";

const inputClass =
  "h-[50px] w-full rounded-lg border border-black/25 px-4 text-[18px] outline-none focus:border-brand-blue";

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const active = useActiveMeeting();
  const { meeting, status } = useMeetingData(active?.code ?? null);

  const [showInvite, setShowInvite] = useState(false);
  const [clubName, setClubName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-opened the app (new tab / browser session) on a device that already
  // joined a meeting: go straight back to the role screen it was using. This
  // only fires once per tab, so the Menu link can still reach the role picker.
  useEffect(() => {
    if (!hydrated || !active?.role || hasResumed()) return;
    // Ignore roles that no longer exist (e.g. an old Table Topics screen).
    if (!TOOLS.some((t) => t.href === active.role)) return;
    markResumed();
    router.replace(active.role);
  }, [hydrated, active, router]);

  // The meeting was deleted on the server: forget it and show the start form.
  useEffect(() => {
    if (status === "missing") clearActiveMeeting();
  }, [status]);

  async function handleCreate() {
    const name = clubName.trim();
    if (!name) {
      setError("Please enter your Toastmasters club name.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createMeeting(name);
    setBusy(false);
    if (!result.meeting) {
      setError(`Could not start the meeting: ${result.error}`);
      return;
    }
    setActiveMeeting(result.meeting.code);
    markResumed();
    setShowInvite(true);
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter the meeting code shown on the QR screen.");
      return;
    }
    setBusy(true);
    setError(null);
    const found = await fetchMeetingByCode(code);
    setBusy(false);
    if (!found) {
      setError("No meeting found with that code. Check it and try again.");
      return;
    }
    setActiveMeeting(found.code);
    markResumed();
  }

  const footer = (
    <footer className="pb-8 text-center text-[14px] text-brand-dark-3 opacity-50">
      Designed and Developed by Muzakki from Berlian Toastmasters Club
    </footer>
  );

  if (!isSupabaseConfigured) {
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

  if (!hydrated) {
    return (
      <>
        <Header />
        <main className="flex-1" />
      </>
    );
  }

  // ---- Step 1: no meeting on this device yet -> start or join one ----------
  if (!active) {
    return (
      <>
        <Header />
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-10 px-6 py-16">
          <div className="flex max-w-[589px] flex-col gap-2 text-center">
            <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
              Start Today&rsquo;s Meeting
            </h1>
            <p className="text-[18px] leading-[1.4] text-brand-dark-1">
              Enter your club name and we&rsquo;ll create a QR code. Every role taker scans it
              on their own device — no need to share a screen.
            </p>
          </div>

          <div className="flex w-full max-w-[480px] flex-col gap-3">
            <label className="text-[18px] font-semibold">Toastmasters Club Name</label>
            <input
              value={clubName}
              onChange={(e) => {
                setClubName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="Example: Berlian Toastmasters"
              className={inputClass}
            />
            <button
              onClick={handleCreate}
              disabled={busy}
              className="rounded-lg brand-gradient px-6 py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save & Show QR Code"}
            </button>
          </div>

          <div className="flex w-full max-w-[480px] items-center gap-4 text-[14px] text-brand-dark-3">
            <span className="h-px flex-1 bg-brand-dark-4" />
            or join a meeting that&rsquo;s already started
            <span className="h-px flex-1 bg-brand-dark-4" />
          </div>

          <div className="flex w-full max-w-[480px] flex-col gap-3 sm:flex-row">
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
              maxLength={8}
              placeholder="Meeting code"
              className={`${inputClass} uppercase tracking-widest`}
            />
            <button
              onClick={handleJoin}
              disabled={busy}
              className="rounded-lg border border-brand-blue px-6 py-3.5 text-[16px] font-semibold text-brand-blue disabled:opacity-50"
            >
              Join
            </button>
          </div>

          {error && <p className="text-[15px] font-medium text-[#f94444]">{error}</p>}
        </main>
        {footer}
      </>
    );
  }

  // ---- Step 2: meeting exists -> role picker --------------------------------
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center gap-10 px-6 py-16">
        <div className="flex max-w-[589px] flex-col items-center gap-2 text-center">
          <p className="text-[16px] font-semibold uppercase tracking-wide text-brand-blue">
            Choose Your Role
          </p>
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
            {meeting?.club_name ?? "Loading meeting..."}
          </h1>
          <p className="text-[18px] leading-[1.4] text-brand-dark-1">
            Select your role to open the tools you need for today&rsquo;s Toastmasters meeting.
          </p>
          <p className="text-[15px] leading-[1.4] text-brand-dark-3">
            Timer goes first: they add the speakers&rsquo; names once, and the Ah &amp; WoD
            Counter and Ballot Counter see them automatically.
          </p>
        </div>

        <div className="flex w-full max-w-[680px] flex-col items-center gap-6">
          {TOOLS.map((tool) => (
            <RoleCard key={tool.href} {...tool} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-[15px] font-semibold">
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 text-brand-blue"
          >
            <QrCode size={18} /> Show Join QR Code
          </button>
        </div>
      </main>
      {footer}

      {showInvite && meeting && (
        <InviteScreen
          clubName={meeting.club_name}
          code={meeting.code}
          primaryLabel="Choose My Role"
          onPrimary={() => setShowInvite(false)}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
