"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import InviteScreen from "@/components/InviteScreen";

/**
 * Thin strip under the header on every role screen: which club/meeting this
 * is, plus a shortcut to re-show the join QR for latecomers.
 */
export default function MeetingBar({ clubName, code }: { clubName: string; code: string }) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <div className="border-b border-brand-dark-4 bg-brand-blue/5">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 py-2.5">
          <p className="truncate text-[14px] text-brand-dark-2">
            <span className="font-semibold text-brand-dark-1">{clubName}</span>
            <span className="mx-2 opacity-40">&middot;</span>
            Code <span className="font-semibold tracking-widest text-brand-blue">{code}</span>
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-brand-blue"
          >
            <QrCode size={16} /> Invite
          </button>
        </div>
      </div>

      {showInvite && (
        <InviteScreen clubName={clubName} code={code} onClose={() => setShowInvite(false)} />
      )}
    </>
  );
}
