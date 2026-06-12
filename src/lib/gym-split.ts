// Shared constants/helpers for the gym split (weekly plan) UI.
import type { ParsedWorkout } from "@/lib/gym-parser";

export const DAY_TYPES: ParsedWorkout["dayType"][] = [
  "PUSH",
  "PULL",
  "UPPER",
  "LOWER",
  "FULL_BODY",
  "CARDIO",
  "OTHER",
];

// Display order: Monday-first. Value is JS Date.getDay() (0=Sun .. 6=Sat).
export const WEEKDAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

export function dayTypeLabel(t: string): string {
  return t.replace("_", " ");
}

// Local YYYY-MM-DD for a Date (no UTC shift — matches how the user perceives "today").
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
