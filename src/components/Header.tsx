"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearActiveMeeting, useActiveMeeting, useHydrated } from "@/lib/active-meeting";

// Shared top bar for every screen. Left side is the official Toastmasters
// International logo (linking home); the right side is "Leave Meeting" once
// this device has joined a meeting, or "Join the Meeting" before that.
export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = useActiveMeeting();
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Voters who only scan the "vote" QR code never join as a role taker, so
  // the join/leave link would just be noise on their page.
  const showAction = hydrated && !pathname.startsWith("/vote/");

  function handleLeave() {
    setConfirmLeave(false);
    clearActiveMeeting();
    router.push("/");
  }

  const actionClass =
    "text-[16px] font-semibold text-brand-dark-2 transition-opacity hover:opacity-70";

  return (
    <header className="border-b border-brand-dark-4">
      <div className="mx-auto flex h-[88px] w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/assets/toastmasters-logo.png"
            alt="Toastmasters International"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
        </Link>
        {showAction &&
          (active ? (
            <button onClick={() => setConfirmLeave(true)} className={actionClass}>
              Leave Meeting
            </button>
          ) : (
            <Link href="/" className={actionClass}>
              Join the Meeting
            </Link>
          ))}
      </div>

      {confirmLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6">
          <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-2xl bg-white p-8 text-center text-brand-dark-1">
            <h3 className="text-[21px] font-extrabold">Leave This Meeting?</h3>
            <p className="text-[15px] text-brand-dark-3">
              This device will leave the meeting. You can come back any time by scanning the QR
              code or entering the meeting code.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmLeave(false)}
                className="rounded-lg border border-black/25 px-6 py-3 text-[15px] font-semibold text-brand-dark-2"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                className="rounded-lg bg-[#f94444] px-6 py-3 text-[15px] font-semibold text-white"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
