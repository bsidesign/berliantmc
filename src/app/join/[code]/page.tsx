"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchMeetingByCode } from "@/lib/meeting";
import { markResumed, setActiveMeeting } from "@/lib/active-meeting";

type Status = "checking" | "not-found" | "unconfigured";

// Landing page for the QR code / shared link: remember the meeting on this
// device, then drop the person on the role picker.
export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<Status>(isSupabaseConfigured ? "checking" : "unconfigured");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    async function join() {
      const meeting = await fetchMeetingByCode(code);
      if (cancelled) return;
      if (!meeting) {
        setStatus("not-found");
        return;
      }
      setActiveMeeting(meeting.code);
      markResumed(); // show the role picker first, don't auto-jump to an old role
      router.replace("/");
    }
    void join();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        {status === "checking" && <p className="text-brand-dark-3">Joining the meeting...</p>}
        {status === "unconfigured" && (
          <p className="max-w-[500px] text-brand-dark-3">
            The app isn&rsquo;t connected to its database yet.
          </p>
        )}
        {status === "not-found" && (
          <>
            <p className="max-w-[500px] text-brand-dark-3">
              No meeting found for code <strong>{code.toUpperCase()}</strong>. Ask whoever
              started the meeting to show the QR code again.
            </p>
            <Link href="/" className="font-semibold text-brand-blue">
              Back to start
            </Link>
          </>
        )}
      </main>
    </>
  );
}
