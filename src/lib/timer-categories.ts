export type TimerCategory = {
  id: string;
  label: string;
  /** seconds elapsed before the green ("minimum/target time reached") light */
  green: number;
  /** seconds elapsed before the yellow ("warning") light */
  yellow: number;
  /** seconds elapsed at the red ("maximum time / stop") light — also the countdown starting point */
  red: number;
  /** seconds elapsed after which the speaker is no longer eligible to be voted for */
  black: number;
};

// Standard Toastmasters timing guidelines. Adjust here if your club uses
// different limits for a role (e.g. General Evaluation varies by club).
// "black" is the standard 30-second grace period past the red/maximum time,
// after which the speaker becomes ineligible to be voted for.
export const TIMER_CATEGORIES: TimerCategory[] = [
  { id: "prepared", label: "Prepared Speech", green: 5 * 60, yellow: 6 * 60, red: 7 * 60, black: 7.5 * 60 },
  { id: "evaluation", label: "Evaluation Speech", green: 2 * 60, yellow: 2.5 * 60, red: 3 * 60, black: 3.5 * 60 },
  { id: "tabletopic", label: "Table Topic", green: 60, yellow: 90, red: 120, black: 150 },
  { id: "general", label: "General Evaluation", green: 2 * 60, yellow: 2.5 * 60, red: 3 * 60, black: 3.5 * 60 },
];

export function formatTime(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalSeconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}