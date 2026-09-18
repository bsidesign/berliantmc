// A per-browser anonymous voter id, persisted in localStorage. Used only to
// stop the same phone/browser voting twice in the same category — not a
// real identity system.
export function getVoterId(): string {
  if (typeof window === "undefined") return "server";
  const key = "berlian-tmc-voter-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
