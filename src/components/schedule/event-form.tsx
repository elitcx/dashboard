"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ExternalLink, MapPin, Plus, RefreshCw, Trash2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/calendar-utils";
import {
  useCalendarList,
  useCreateEvent,
  useDeleteEvent,
  useGetEvent,
  useUpdateEvent,
} from "@/hooks/use-calendar";
import type {
  CalendarEvent,
  EventReminder,
} from "@/lib/google-calendar";

type EventFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
  defaultEndDate?: Date;
};

function toLocalDatetimeInput(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateInput(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDuration(startStr: string, endStr: string): { h: number; m: number } {
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return { h: 1, m: 0 };
  const diffMins = Math.max(15, (e.getTime() - s.getTime()) / 60000);
  return { h: Math.floor(diffMins / 60), m: Math.round(diffMins % 60) };
}

function addDurationToStart(startStr: string, h: number, m: number): string {
  const s = new Date(startStr);
  if (isNaN(s.getTime())) return "";
  return toLocalDatetimeInput(new Date(s.getTime() + (h * 60 + m) * 60000));
}

// ── Custom checkbox ───────────────────────────────────────────────────────────
function CustomCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
        checked
          ? "border-emerald-500/60 bg-emerald-500/20 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
          : "border-white/20 bg-white/[0.03] hover:border-white/35",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />}
    </button>
  );
}

// ── Color palette ─────────────────────────────────────────────────────────────
type ColorOption = { id: string | undefined; name: string; bg: string; border?: boolean };

const COLOR_OPTIONS: ColorOption[] = [
  { id: undefined, name: "Default", bg: "transparent", border: true },
  { id: "1",  name: "Lavender",  bg: "#7986CB" },
  { id: "2",  name: "Sage",      bg: "#33B679" },
  { id: "3",  name: "Grape",     bg: "#8E24AA" },
  { id: "4",  name: "Flamingo",  bg: "#E67C73" },
  { id: "5",  name: "Banana",    bg: "#F6BF26" },
  { id: "6",  name: "Tangerine", bg: "#F4511E" },
  { id: "7",  name: "Peacock",   bg: "#039BE5" },
  { id: "8",  name: "Graphite",  bg: "#616161" },
  { id: "9",  name: "Blueberry", bg: "#3F51B5" },
  { id: "10", name: "Basil",     bg: "#0B8043" },
  { id: "11", name: "Tomato",    bg: "#D50000" },
];

// ── Recurrence helpers ────────────────────────────────────────────────────────
const DAYS_OF_WEEK = [
  { key: "SU", label: "S", full: "Sunday" },
  { key: "MO", label: "M", full: "Monday" },
  { key: "TU", label: "T", full: "Tuesday" },
  { key: "WE", label: "W", full: "Wednesday" },
  { key: "TH", label: "T", full: "Thursday" },
  { key: "FR", label: "F", full: "Friday" },
  { key: "SA", label: "S", full: "Saturday" },
];

function getDefaultWeekday(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "MO";
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d.getDay()];
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "day";
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function buildRRule(
  preset: string,
  start: string,
  customInterval: number,
  customFreq: string,
  customDays: string[],
  customEndType: string,
  customEndDate: string,
  customEndCount: number,
): string | null {
  if (preset === "none") return null;
  if (preset === "daily") return "RRULE:FREQ=DAILY";
  if (preset === "weekdays") return "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
  if (preset === "monthly") return "RRULE:FREQ=MONTHLY";
  if (preset === "annually") return "RRULE:FREQ=YEARLY";
  if (preset === "weekly") {
    const day = getDefaultWeekday(start);
    return `RRULE:FREQ=WEEKLY;BYDAY=${day}`;
  }
  if (preset === "custom") {
    let rule = `RRULE:FREQ=${customFreq}`;
    if (customInterval > 1) rule += `;INTERVAL=${customInterval}`;
    if (customFreq === "WEEKLY" && customDays.length > 0) {
      rule += `;BYDAY=${customDays.join(",")}`;
    }
    if (customEndType === "count" && customEndCount > 0) {
      rule += `;COUNT=${customEndCount}`;
    } else if (customEndType === "date" && customEndDate) {
      const until = new Date(customEndDate + "T23:59:59Z");
      const y = until.getUTCFullYear();
      const mo = String(until.getUTCMonth() + 1).padStart(2, "0");
      const d = String(until.getUTCDate()).padStart(2, "0");
      rule += `;UNTIL=${y}${mo}${d}T235959Z`;
    }
    return rule;
  }
  return null;
}

type RRuleParsed = {
  preset: string;
  customFreq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  customInterval: number;
  customDays: string[];
  customEndType: "never" | "date" | "count";
  customEndDate: string;
  customEndCount: number;
};

function parseRRule(rruleStr: string): RRuleParsed {
  const rule = rruleStr.replace(/^RRULE:/, "");
  const parts: Record<string, string> = {};
  rule.split(";").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq !== -1) parts[part.slice(0, eq)] = part.slice(eq + 1);
  });

  const freq = (parts.FREQ ?? "WEEKLY") as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  const interval = parseInt(parts.INTERVAL ?? "1") || 1;
  const byday = parts.BYDAY ? parts.BYDAY.split(",") : [];

  let customEndType: "never" | "date" | "count" = "never";
  let customEndDate = "";
  let customEndCount = 10;
  if (parts.COUNT) {
    customEndType = "count";
    customEndCount = parseInt(parts.COUNT) || 10;
  } else if (parts.UNTIL) {
    customEndType = "date";
    const u = parts.UNTIL;
    customEndDate = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`;
  }

  const weekdaySet = new Set(byday);
  const isWeekdays =
    freq === "WEEKLY" &&
    weekdaySet.size === 5 &&
    ["MO", "TU", "WE", "TH", "FR"].every((d) => weekdaySet.has(d));

  let preset = "custom";
  if (freq === "DAILY" && interval === 1 && byday.length === 0 && customEndType === "never") {
    preset = "daily";
  } else if (isWeekdays && interval === 1 && customEndType === "never") {
    preset = "weekdays";
  } else if (freq === "WEEKLY" && interval === 1 && byday.length <= 1 && customEndType === "never") {
    preset = "weekly";
  } else if (freq === "MONTHLY" && interval === 1 && byday.length === 0 && customEndType === "never") {
    preset = "monthly";
  } else if (freq === "YEARLY" && interval === 1 && customEndType === "never") {
    preset = "annually";
  }

  return { preset, customFreq: freq, customInterval: interval, customDays: byday, customEndType, customEndDate, customEndCount };
}

const REMINDER_PRESETS = [
  { label: "At time of event",  minutes: 0    },
  { label: "5 minutes before",  minutes: 5    },
  { label: "10 minutes before", minutes: 10   },
  { label: "15 minutes before", minutes: 15   },
  { label: "30 minutes before", minutes: 30   },
  { label: "1 hour before",     minutes: 60   },
  { label: "2 hours before",    minutes: 120  },
  { label: "1 day before",      minutes: 1440 },
];

// ── Main component ────────────────────────────────────────────────────────────
export function EventForm({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultEndDate,
}: EventFormProps) {
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const del    = useDeleteEvent();
  const { data: calData } = useCalendarList();
  const { data: masterData } = useGetEvent(
    event?.recurringEventId,
    event?.calendarId,
  );

  const writableCalendars = useMemo(
    () => (calData?.calendars ?? []).filter(
      (c) => c.accessRole === "owner" || c.accessRole === "writer",
    ),
    [calData?.calendars],
  );

  const [calendarId, setCalendarId]       = useState<string>("primary");
  const [title, setTitle]                 = useState("");
  const [description, setDescription]     = useState("");
  const [location, setLocation]           = useState("");
  const [allDay, setAllDay]               = useState(false);
  const [start, setStart]                 = useState("");
  const [end, setEnd]                     = useState("");
  const [endMode, setEndMode]             = useState<"time" | "duration">("time");
  const [durationH, setDurationH]         = useState(1);
  const [durationM, setDurationM]         = useState(0);
  const [colorId, setColorId]             = useState<string | undefined>(undefined);
  const [reminders, setReminders]         = useState<EventReminder[]>([]);
  const [useDefaultReminders, setUseDefaultReminders] = useState(true);
  const [addMeet, setAddMeet]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [recurrencePreset, setRecurrencePreset] = useState<string>("none");
  const [customFreq, setCustomFreq]             = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("WEEKLY");
  const [customInterval, setCustomInterval]     = useState(1);
  const [customDays, setCustomDays]             = useState<string[]>([]);
  const [customEndType, setCustomEndType]       = useState<"never" | "date" | "count">("never");
  const [customEndDate, setCustomEndDate]       = useState("");
  const [customEndCount, setCustomEndCount]     = useState(10);
  const [scopeDialog, setScopeDialog]           = useState<"edit" | "delete" | null>(null);

  // Sync end when start changes while in duration mode
  useEffect(() => {
    if (endMode !== "duration" || !start || allDay) return;
    const newEnd = addDurationToStart(start, durationH, durationM);
    if (newEnd) setEnd(newEnd);
  }, [start, endMode, durationH, durationM, allDay]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEndMode("time");
    setScopeDialog(null);

    // Populate recurrence from master event if available, otherwise reset
    const rruleStr = masterData?.event?.recurrence?.[0] ?? event?.recurrence?.[0];
    if (rruleStr) {
      const parsed = parseRRule(rruleStr);
      setRecurrencePreset(parsed.preset);
      setCustomFreq(parsed.customFreq);
      setCustomInterval(parsed.customInterval);
      setCustomDays(parsed.customDays);
      setCustomEndType(parsed.customEndType);
      setCustomEndDate(parsed.customEndDate);
      setCustomEndCount(parsed.customEndCount);
    } else {
      setRecurrencePreset("none");
      setCustomFreq("WEEKLY");
      setCustomInterval(1);
      setCustomDays([]);
      setCustomEndType("never");
      setCustomEndDate("");
      setCustomEndCount(10);
    }

    if (event) {
      setCalendarId(event.calendarId || "primary");
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setAllDay(event.allDay);
      const s = event.allDay ? toLocalDateInput(event.start) : toLocalDatetimeInput(event.start);
      const e = event.allDay ? toLocalDateInput(event.end)   : toLocalDatetimeInput(event.end);
      setStart(s);
      setEnd(e);
      const dur = getDuration(s, e);
      setDurationH(dur.h);
      setDurationM(dur.m);
      setColorId(event.colorId);
      setReminders(event.reminders);
      setUseDefaultReminders(event.remindersUseDefault);
      setAddMeet(false);
    } else {
      const base      = defaultDate ?? new Date();
      const startDate = new Date(base);
      startDate.setMinutes(0, 0, 0);
      if (startDate < new Date()) startDate.setHours(startDate.getHours() + 1);
      const endDate   = defaultEndDate ?? new Date(startDate.getTime() + 3600000);

      const primary =
        writableCalendars.find((c) => c.primary)?.id ??
        writableCalendars[0]?.id ??
        "primary";

      setCalendarId(primary);
      setTitle("");
      setDescription("");
      setLocation("");
      setAllDay(false);
      const s = toLocalDatetimeInput(startDate);
      const e = toLocalDatetimeInput(endDate);
      setStart(s);
      setEnd(e);
      const dur = getDuration(s, e);
      setDurationH(dur.h);
      setDurationM(dur.m);
      setColorId(undefined);
      setReminders([]);
      setUseDefaultReminders(true);
      setAddMeet(false);
    }
  }, [open, event, defaultDate, defaultEndDate, writableCalendars, masterData]);

  const isReadOnly  = Boolean(event?.readOnly);
  const selectedCal = useMemo(
    () => (calData?.calendars ?? []).find((c) => c.id === calendarId),
    [calData?.calendars, calendarId],
  );

  function switchToDuration() {
    const dur = getDuration(start, end);
    setDurationH(dur.h);
    setDurationM(dur.m);
    setEndMode("duration");
  }

  function addReminder() {
    setUseDefaultReminders(false);
    setReminders((curr) => [...curr, { method: "popup", minutes: 10 }]);
  }
  function updateReminder(idx: number, patch: Partial<EventReminder>) {
    setUseDefaultReminders(false);
    setReminders((curr) => curr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeReminder(idx: number) {
    setUseDefaultReminders(false);
    setReminders((curr) => curr.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }

    if (event?.recurringEventId) {
      setScopeDialog("edit");
      return;
    }
    await executeSubmit("this");
  }

  async function executeSubmit(scope: "this" | "all") {
    setScopeDialog(null);
    setError(null);
    const startIso = allDay ? `${start}T00:00:00` : new Date(start).toISOString();
    const endIso   = allDay ? `${end}T00:00:00`   : new Date(end).toISOString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const basePayload = {
      calendarId, title,
      description: description || undefined,
      location:    location    || undefined,
      start: startIso, end: endIso, allDay, timeZone,
      reminders: useDefaultReminders ? undefined : reminders,
      useDefaultReminders,
    };

    const rrule = buildRRule(recurrencePreset, start, customInterval, customFreq, customDays, customEndType, customEndDate, customEndCount);

    try {
      if (event) {
        const eventId = scope === "all" ? (event.recurringEventId ?? event.id) : event.id;
        // Only send recurrence when editing all events (master event accepts it; instances don't)
        const recurrence = scope === "all" ? (rrule ? [rrule] : []) : undefined;
        await update.mutateAsync({ id: eventId, ...basePayload, colorId: colorId ?? null, recurrence });
      } else {
        await create.mutateAsync({ ...basePayload, colorId, addMeet, recurrence: rrule ? [rrule] : undefined });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  async function onDelete() {
    if (!event) return;
    if (event.recurringEventId) {
      setScopeDialog("delete");
      return;
    }
    await executeDelete("this");
  }

  async function executeDelete(scope: "this" | "all") {
    setScopeDialog(null);
    if (!event) return;
    const eventId = scope === "all" ? (event.recurringEventId ?? event.id) : event.id;
    try {
      await del.mutateAsync({ id: eventId, calendarId: event.calendarId });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedCal && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedCal.backgroundColor }}
              />
            )}
            {event ? "Edit event" : "New event"}
            {isReadOnly && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
                Read-only
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add title"
            disabled={isReadOnly}
            required
            autoFocus
            className="!text-lg !font-medium"
          />

          {/* All-day toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <CustomCheckbox
              checked={allDay}
              disabled={isReadOnly}
              onChange={(next) => {
                setAllDay(next);
                setEndMode("time");
                if (next) {
                  setStart(toLocalDateInput(start || new Date()));
                  setEnd(toLocalDateInput(end || new Date()));
                } else {
                  setStart(toLocalDatetimeInput(start || new Date()));
                  setEnd(toLocalDatetimeInput(end || new Date()));
                }
              }}
            />
            <span className="text-sm text-white">All day</span>
          </label>

          {/* Start / End */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start</Label>
              <DateTimePicker
                mode={allDay ? "date" : "datetime"}
                value={start}
                onChange={setStart}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              {/* End label with mode toggle */}
              <div className="flex items-center gap-2">
                <Label>{endMode === "duration" ? "Duration" : "End"}</Label>
                {!allDay && !isReadOnly && (
                  <div className="ml-auto flex overflow-hidden rounded-full border border-white/10 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setEndMode("time")}
                      className={cn(
                        "px-2.5 py-1 transition-colors",
                        endMode === "time"
                          ? "bg-white/10 text-white"
                          : "text-muted-foreground hover:text-white",
                      )}
                    >
                      End time
                    </button>
                    <button
                      type="button"
                      onClick={switchToDuration}
                      className={cn(
                        "px-2.5 py-1 transition-colors",
                        endMode === "duration"
                          ? "bg-white/10 text-white"
                          : "text-muted-foreground hover:text-white",
                      )}
                    >
                      Duration
                    </button>
                  </div>
                )}
              </div>

              {endMode === "time" || allDay ? (
                <DateTimePicker
                  mode={allDay ? "date" : "datetime"}
                  value={end}
                  onChange={setEnd}
                  disabled={isReadOnly}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={durationH}
                    onChange={(e) => setDurationH(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    disabled={isReadOnly}
                    className="w-10 bg-transparent text-center text-sm text-white focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={15}
                    value={durationM}
                    onChange={(e) => setDurationM(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    disabled={isReadOnly}
                    className="w-10 bg-transparent text-center text-sm text-white focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-sm text-muted-foreground">m</span>
                </div>
              )}
            </div>
          </div>

          {/* Recurrence */}
          {!isReadOnly && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Repeat
              </Label>
              <select
                value={recurrencePreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setRecurrencePreset(val);
                  if (val === "custom" && customDays.length === 0 && start) {
                    setCustomDays([getDefaultWeekday(start)]);
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly on {getDayLabel(start)}</option>
                <option value="weekdays">Every weekday (Mon to Fri)</option>
                <option value="monthly">Monthly</option>
                <option value="annually">Annually</option>
                <option value="custom">Custom…</option>
              </select>

              {recurrencePreset === "custom" && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  {/* Repeat every N [freq] */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Repeat every</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={customInterval}
                      onChange={(e) => setCustomInterval(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                      className="w-14 rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-center text-sm text-white focus:outline-none"
                    />
                    <select
                      value={customFreq}
                      onChange={(e) => setCustomFreq(e.target.value as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY")}
                      className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none"
                    >
                      <option value="DAILY">day{customInterval !== 1 ? "s" : ""}</option>
                      <option value="WEEKLY">week{customInterval !== 1 ? "s" : ""}</option>
                      <option value="MONTHLY">month{customInterval !== 1 ? "s" : ""}</option>
                      <option value="YEARLY">year{customInterval !== 1 ? "s" : ""}</option>
                    </select>
                  </div>

                  {/* Days of week (weekly only) */}
                  {customFreq === "WEEKLY" && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground">Repeat on</span>
                      <div className="flex gap-1.5">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.key}
                            type="button"
                            title={day.full}
                            onClick={() =>
                              setCustomDays((prev) =>
                                prev.includes(day.key)
                                  ? prev.filter((d) => d !== day.key)
                                  : [...prev, day.key],
                              )
                            }
                            className={cn(
                              "h-8 w-8 rounded-full text-xs font-medium transition-all",
                              customDays.includes(day.key)
                                ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                                : "border border-white/10 text-muted-foreground hover:border-white/20 hover:text-white",
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End condition */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Ends</span>
                    <div className="space-y-1.5">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="endType"
                          value="never"
                          checked={customEndType === "never"}
                          onChange={() => setCustomEndType("never")}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm text-white">Never</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="endType"
                          value="date"
                          checked={customEndType === "date"}
                          onChange={() => setCustomEndType("date")}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm text-white">On</span>
                        {customEndType === "date" && (
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none"
                          />
                        )}
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="endType"
                          value="count"
                          checked={customEndType === "count"}
                          onChange={() => setCustomEndType("count")}
                          className="accent-emerald-500"
                        />
                        <span className="text-sm text-white">After</span>
                        {customEndType === "count" && (
                          <>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={customEndCount}
                              onChange={(e) =>
                                setCustomEndCount(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))
                              }
                              className="w-16 rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-center text-sm text-white focus:outline-none"
                            />
                            <span className="text-sm text-white">occurrences</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calendar picker */}
          {writableCalendars.length > 0 && (
            <div className="space-y-2">
              <Label>Calendar</Label>
              <div className="flex flex-wrap gap-2">
                {writableCalendars.map((cal) => {
                  const active = cal.id === calendarId;
                  return (
                    <button
                      type="button"
                      key={cal.id}
                      disabled={isReadOnly}
                      onClick={() => setCalendarId(cal.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                        active
                          ? "text-white shadow-sm"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-white",
                        "disabled:opacity-50",
                      )}
                      style={active ? {
                        backgroundColor: hexToRgba(cal.backgroundColor, 0.2),
                        borderColor: hexToRgba(cal.backgroundColor, 0.5),
                      } : {}}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: cal.backgroundColor }}
                      />
                      {cal.name}
                      {active && <Check className="h-2.5 w-2.5 opacity-70" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Event color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => {
                const active = colorId === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id ?? "default"}
                    title={opt.name}
                    disabled={isReadOnly}
                    onClick={() => setColorId(opt.id)}
                    className={cn(
                      "relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                      opt.border && "border border-dashed border-white/30",
                      active && "ring-2 ring-white ring-offset-2 ring-offset-black",
                    )}
                    style={{ backgroundColor: opt.bg }}
                  >
                    {active && opt.id && (
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add a place or address"
              disabled={isReadOnly}
            />
          </div>

          {/* Google Meet toggle (new events only) */}
          {!event && (
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <CustomCheckbox checked={addMeet} onChange={setAddMeet} />
              <Video className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-white">Add Google Meet video conferencing</span>
            </label>
          )}

          {event?.meetingUrl && (
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/10"
            >
              <Video className="h-4 w-4" />
              <span className="flex-1 truncate">Join with Google Meet</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Reminders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Notifications
              </Label>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={addReminder}
                className="flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>

            {useDefaultReminders ? (
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setUseDefaultReminders(false)}
                className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-left text-xs text-muted-foreground hover:bg-white/[0.04] disabled:cursor-not-allowed"
              >
                Using this calendar&apos;s default notifications. Click to customize.
              </button>
            ) : reminders.length === 0 ? (
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setUseDefaultReminders(true)}
                className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-left text-xs text-muted-foreground hover:bg-white/[0.04] disabled:cursor-not-allowed"
              >
                No notifications. Click to use this calendar&apos;s defaults instead.
              </button>
            ) : (
              <div className="space-y-1.5">
                {reminders.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <select
                      disabled={isReadOnly}
                      value={r.method}
                      onChange={(e) => updateReminder(idx, { method: e.target.value as "popup" | "email" })}
                      className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-xs text-white"
                    >
                      <option value="popup" className="bg-neutral-900 text-white">Notification</option>
                      <option value="email" className="bg-neutral-900 text-white">Email</option>
                    </select>
                    <select
                      disabled={isReadOnly}
                      value={r.minutes}
                      onChange={(e) => updateReminder(idx, { minutes: Number(e.target.value) })}
                      className="flex-1 rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-xs text-white"
                    >
                      {!REMINDER_PRESETS.some((p) => p.minutes === r.minutes) && (
                        <option value={r.minutes} className="bg-neutral-900 text-white">{r.minutes} min before (custom)</option>
                      )}
                      {REMINDER_PRESETS.map((p) => (
                        <option key={p.minutes} value={p.minutes} className="bg-neutral-900 text-white">{p.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeReminder(idx)}
                      disabled={isReadOnly}
                      className="text-muted-foreground transition-colors hover:text-rose-300 disabled:opacity-40"
                      aria-label="Remove notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, links, or notes…"
              rows={4}
              disabled={isReadOnly}
              className="flex w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {event?.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-emerald-300"
            >
              Open in Google Calendar
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          {scopeDialog !== null ? (
            <div className="!mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">
                {scopeDialog === "delete" ? "Delete recurring event" : "Edit recurring event"}
              </p>
              <p className="text-xs text-muted-foreground">
                {scopeDialog === "delete"
                  ? "Which events do you want to delete?"
                  : "Which events do you want to edit?"}
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => scopeDialog === "delete" ? executeDelete("this") : executeSubmit("this")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.06]"
                >
                  This event
                </button>
                <button
                  type="button"
                  onClick={() => scopeDialog === "delete" ? executeDelete("all") : executeSubmit("all")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.06]"
                >
                  All events
                </button>
              </div>
              <button
                type="button"
                onClick={() => setScopeDialog(null)}
                className="text-xs text-muted-foreground transition-colors hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="!mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {event && !isReadOnly ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="self-start text-red-300/80 hover:text-red-300"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              ) : (
                <div className="hidden sm:block" />
              )}
              <div className="flex gap-2 sm:ml-auto">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial">
                  {isReadOnly ? "Close" : "Cancel"}
                </Button>
                {!isReadOnly && (
                  <Button type="submit" disabled={isPending} className="flex-1 sm:flex-initial">
                    {isPending ? "Saving…" : event ? "Save" : "Create"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
