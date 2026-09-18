import { Timer, Lightbulb, Megaphone, BarChart3, type LucideIcon } from "lucide-react";

export type ToolDef = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
};

// Single source of truth for the four meeting tools — used on the Home
// dashboard and can be reused anywhere else the app needs the tool list.
export const TOOLS: ToolDef[] = [
  {
    href: "/timer",
    icon: Timer,
    title: "Timer",
    description:
      "Set the timer and signal speakers when they reach each time limit.",
    cta: "Open Timer",
  },
  {
    href: "/table-topics",
    icon: Lightbulb,
    title: "Table Topics Master",
    description:
      "Generate random topics and invite members to give impromptu speeches.",
    cta: "Open TTM",
  },
  {
    href: "/ah-counter",
    icon: Megaphone,
    title: "Ah & WoD Counter",
    description:
      "Track filler words and Word of the Day usage throughout the meeting.",
    cta: "Open Counter",
  },
  {
    href: "/ballot",
    icon: BarChart3,
    title: "Ballot Counter",
    description:
      "Collect votes and automatically calculate the results for meeting awards.",
    cta: "Open Ballot",
  },
];
