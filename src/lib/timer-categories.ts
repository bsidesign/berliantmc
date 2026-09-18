export type TimerCategory = {
  id: string;
  label: string;
  /** seconds elapsed before the green ("qualified to stop") light */
  green: number;
  /** seconds elapsed before the yellow ("wrap up") light */
  yellow: number;
  /** seconds elapsed at the red ("time's up") light — also the countdown starting point */
  red: number;
};

// Standard Toastmasters timing guidelines. Adjust here if your club uses
// different limits for a role (e.g. General Evaluation varies by club).
export const TIMER_CATEGORIES: TimerCategory[] = [
  { id: "prepared", label: "Prepared Speech", green: 5 * 60, yellow: 6 * 60, red: 7 * 60 },
  { id: "evaluation", label: "Evaluation Speech", green: 2 * 60, yellow: 2.5 * 60, red: 3 * 60 },
  { id: "tabletopic", label: "Table Topic", green: 60, yellow: 90, red: 120 },
  { id: "general", label: "General Evaluation", green: 2 * 60, yellow: 2.5 * 60, red: 3 * 60 },
];

export function formatTime(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalSeconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
