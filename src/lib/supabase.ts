import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  // Surfaces a clear warning instead of a cryptic client crash. A
  // placeholder URL below keeps createClient() from throwing at build
  // time (e.g. during Vercel prerendering before real env vars are set) —
  // the pages themselves check isSupabaseConfigured and show a friendly
  // message instead of trying to call out to this placeholder.
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — shared meetings will not work until these are set."
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
);

export function randomCode(length = 5) {
  // Skips visually-confusing characters (0/O, 1/I).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
