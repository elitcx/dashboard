"use client";

import { useState, useEffect } from "react";
import { format as fmtDate, isValid } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

type Mode = "date" | "datetime";

type Props = {
  value: string;          // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  onChange: (v: string) => void;
  mode?: Mode;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

// ── Parsing / formatting helpers ──────────────────────────────────────────────

function parseLocal(value: string): Date | undefined {
  if (!value) return undefined;
  // "YYYY-MM-DD" → local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, mo, d] = value.split("-").map(Number);
    const date = new Date(y, mo - 1, d);
    return isValid(date) ? date : undefined;
  }
  // "YYYY-MM-DDTHH:MM"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const [datePart, timePart] = value.split("T");
    const [y, mo, d] = datePart.split("-").map(Number);
    const [h, m] = timePart.split(":").map(Number);
    const date = new Date(y, mo - 1, d, h, m);
    return isValid(date) ? date : undefined;
  }
  return undefined;
}

function toOutputStr(date: Date, h: number, m: number, mode: Mode): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y  = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d  = pad(date.getDate());
  if (mode === "date") return `${y}-${mo}-${d}`;
  return `${y}-${mo}-${d}T${pad(h)}:${pad(m)}`;
}

function displayStr(date: Date | undefined, h: number, m: number, mode: Mode): string {
  if (!date) return "";
  if (mode === "date") return fmtDate(date, "MMM d, yyyy");
  const period  = h >= 12 ? "PM" : "AM";
  const display = h % 12 || 12;
  return `${fmtDate(date, "MMM d, yyyy")} ${display}:${String(m).padStart(2, "0")} ${period}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DateTimePicker({
  value,
  onChange,
  mode = "datetime",
  disabled,
  placeholder,
  className,
}: Props) {
  const parsed = parseLocal(value);
  const [open, setOpen]     = useState(false);
  const [hours, setHours]   = useState(parsed ? parsed.getHours()   : 9);
  const [mins, setMins]     = useState(parsed ? parsed.getMinutes() : 0);

  // Keep hour/minute in sync when value is updated externally (e.g. drag-select)
  useEffect(() => {
    const p = parseLocal(value);
    if (p) {
      setHours(p.getHours());
      setMins(p.getMinutes());
    }
  }, [value]);

  function handleDay(day: Date | undefined) {
    if (!day) return;
    onChange(toOutputStr(day, hours, mins, mode));
    if (mode === "date") setOpen(false);
  }

  function handleTime(h: number, m: number) {
    setHours(h);
    setMins(m);
    if (parsed) onChange(toOutputStr(parsed, h, m, mode));
  }

  const display12H = hours % 12 || 12;
  const isPM       = hours >= 12;

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm transition-colors",
            parsed ? "text-white" : "text-muted-foreground",
            "hover:border-white/20 focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          <span className="flex-1 truncate">
            {parsed
              ? displayStr(parsed, hours, mins, mode)
              : (placeholder ?? (mode === "date" ? "Pick a date" : "Pick date & time"))}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[200] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl shadow-black/60 outline-none"
        >
          <DayPicker
            mode="single"
            selected={parsed}
            onSelect={handleDay}
            defaultMonth={parsed}
            showOutsideDays
            classNames={{
              root:             "p-3 select-none",
              months:           "flex flex-col",
              month:            "space-y-2",
              month_caption:    "flex items-center justify-between px-1 mb-1",
              caption_label:    "text-sm font-semibold text-white",
              nav:              "flex items-center gap-1",
              button_previous:  "flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white",
              button_next:      "flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white",
              month_grid:       "w-full border-collapse",
              weekdays:         "flex mb-1",
              weekday:          "flex h-8 w-9 items-center justify-center text-[11px] font-medium text-muted-foreground/50",
              weeks:            "space-y-0.5",
              week:             "flex",
              day:              "h-9 w-9 p-0 text-center",
              day_button:       "h-9 w-9 w-full rounded-xl text-sm font-medium text-white/75 transition-all hover:bg-white/[0.08] hover:text-white",
              selected:         "[&>button]:!bg-emerald-500 [&>button]:!text-black [&>button]:shadow-[0_0_12px_rgba(16,185,129,0.35)] [&>button]:hover:!bg-emerald-400",
              today:            "[&>button]:ring-1 [&>button]:ring-white/25 [&>button]:text-white",
              outside:          "[&>button]:text-white/20 [&>button]:hover:bg-transparent",
              disabled:         "[&>button]:cursor-not-allowed [&>button]:text-white/15 [&>button]:hover:bg-transparent",
            }}
            components={{
              Chevron: ({ orientation }: { orientation?: string }) =>
                orientation === "left"
                  ? <ChevronLeft  className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />,
            }}
          />

          {mode === "datetime" && (
            <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                {/* Hour */}
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={display12H}
                  onChange={(e) => {
                    let h = parseInt(e.target.value) || 1;
                    h = Math.max(1, Math.min(12, h));
                    const h24 = isPM ? (h % 12) + 12 : h % 12;
                    handleTime(h24, mins);
                  }}
                  className="w-9 bg-transparent text-center text-sm font-medium text-white focus:outline-none"
                />
                <span className="text-sm text-muted-foreground">:</span>
                {/* Minute */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={String(mins).padStart(2, "0")}
                  onChange={(e) => {
                    const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    handleTime(hours, m);
                  }}
                  className="w-9 bg-transparent text-center text-sm font-medium text-white focus:outline-none"
                />
                {/* AM / PM */}
                <div className="ml-auto flex overflow-hidden rounded-lg border border-white/10 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => { if (isPM) handleTime(hours - 12, mins); }}
                    className={cn(
                      "px-2 py-1 transition-colors",
                      !isPM ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white",
                    )}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!isPM) handleTime(hours + 12, mins); }}
                    className={cn(
                      "px-2 py-1 transition-colors",
                      isPM ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white",
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
