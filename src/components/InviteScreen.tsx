"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function joinUrlFor(code: string) {
  return typeof window === "undefined" ? "" : `${window.location.origin}/join/${code}`;
}

/**
 * Full-screen "scan to join" card, sized to be projected or held up so every
 * role taker can open the meeting on their own device.
 */
export default function InviteScreen({
  clubName,
  code,
  primaryLabel,
  onPrimary,
  onClose,
}: {
  clubName: string;
  code: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = joinUrlFor(code);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto brand-gradient p-8 text-center text-white">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-6 top-6 rounded-full border border-white/60 p-2 opacity-80 hover:opacity-100"
        >
          <X size={22} />
        </button>
      )}

      <div className="flex flex-col items-center gap-1">
        <p className="text-[16px] font-semibold uppercase tracking-wide opacity-80">{clubName}</p>
        <h1 className="text-[32px] font-extrabold sm:text-[42px]">Scan to Join the Meeting</h1>
        <p className="max-w-[440px] text-[16px] opacity-80">
          Everyone scans this QR code (or opens the link) on their own device, then picks
          their role.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-brand-dark-1">
        <QRCodeSVG value={url} size={200} />
        <p className="text-[14px] uppercase tracking-wide text-brand-dark-3">Or enter this code</p>
        <p className="text-[42px] font-semibold tracking-widest text-brand-blue">{code}</p>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 text-[14px] font-semibold text-brand-dark-2"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied!" : "Copy meeting link"}
        </button>
      </div>

      {onPrimary && (
        <button
          onClick={onPrimary}
          className="rounded-lg bg-white px-8 py-4 text-[16px] font-semibold text-brand-blue"
        >
          {primaryLabel ?? "Continue"}
        </button>
      )}
    </div>
  );
}
