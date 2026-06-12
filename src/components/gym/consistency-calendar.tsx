"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { useConsistency } from "@/hooks/use-gym";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/gym-split";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_GRID_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Longest run of consecutive worked-out calendar days ending at today.
function currentStreak(workoutSet: Set<string>): number {
  let streak = 0;
  let cursor = new Date();
  // Allow today to be missing without breaking the streak (day not over yet).
  if (!workoutSet.has(localDateKey(cursor))) cursor = addDays(cursor, -1);
  while (workoutSet.has(localDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function ConsistencyCalendar() {
  const { data, isLoading } = useConsistency(365);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month

  const workoutSet = useMemo(
    () => new Set((data?.workoutDays ?? []).map((w) => w.date)),
    [data],
  );
  const plannedWeekdays = useMemo(
    () => new Set(data?.plannedWeekdays ?? []),
    [data],
  );
  const hasSplit = data?.hasSplit ?? false;

  // ── Year heatmap (GitHub-style, Sunday-top columns) ──
  const heatmap = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start 52 weeks back, aligned to the Sunday of that week.
    let start = addDays(today, -364);
    start = addDays(start, -start.getDay()); // back to Sunday
    const weeks: { key: string; worked: boolean; future: boolean }[][] = [];
    let cursor = new Date(start);
    while (cursor <= today || cursor.getDay() !== 0) {
      const week: { key: string; worked: boolean; future: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        const key = localDateKey(cursor);
        week.push({ key, worked: workoutSet.has(key), future: cursor > today });
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
      if (cursor > today && cursor.getDay() === 0) break;
    }
    return weeks;
  }, [workoutSet]);

  const totalSessions = workoutSet.size;
  const streak = useMemo(() => currentStreak(workoutSet), [workoutSet]);

  // ── Month grid (Monday-first) ──
  const month = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = base.getFullYear();
    const monthIdx = base.getMonth();
    const firstWeekday = (base.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const todayKey = localDateKey(now);

    const cells: ({ date: Date; key: string } | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIdx, day);
      cells.push({ date, key: localDateKey(date) });
    }
    return { year, monthIdx, cells, todayKey };
  }, [monthOffset]);

  function dayState(cell: { date: Date; key: string }): "done" | "missed" | "rest" | "future" | "today-empty" {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (cell.date > todayDate) return "future";
    if (workoutSet.has(cell.key)) return "done";
    if (cell.key === month.todayKey) return "today-empty";
    if (hasSplit && plannedWeekdays.has(cell.date.getDay())) return "missed";
    return "rest";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* Heatmap card */}
      <div className="glass rounded-3xl p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-medium text-white">Consistency</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Flame className="h-3.5 w-3.5" />
              {streak} day{streak !== 1 ? "s" : ""} streak
            </span>
            <span className="text-muted-foreground">
              {totalSessions} session{totalSessions !== 1 ? "s" : ""} · last year
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-28 items-center justify-center">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-[3px]">
                {heatmap.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((cell) => (
                      <div
                        key={cell.key}
                        title={cell.future ? undefined : `${cell.key}${cell.worked ? " · worked out" : ""}`}
                        className={cn(
                          "h-[11px] w-[11px] rounded-[3px]",
                          cell.future
                            ? "bg-transparent"
                            : cell.worked
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                              : "bg-white/[0.06]",
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
              <span>Less</span>
              <div className="h-[11px] w-[11px] rounded-[3px] bg-white/[0.06]" />
              <div className="h-[11px] w-[11px] rounded-[3px] bg-emerald-400/60" />
              <div className="h-[11px] w-[11px] rounded-[3px] bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>More</span>
            </div>
          </>
        )}
      </div>

      {/* Month grid card */}
      <div className="glass rounded-3xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-medium text-white">
            {MONTH_NAMES[month.monthIdx]} {month.year}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
              disabled={monthOffset >= 0}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {MONTH_GRID_LABELS.map((l) => (
            <div key={l} className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {l}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {month.cells.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const state = dayState(cell);
            const isToday = cell.key === month.todayKey;
            return (
              <div
                key={i}
                title={cell.key}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl text-xs font-medium transition-colors",
                  state === "done" &&
                    "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40",
                  state === "missed" && "bg-red-500/10 text-red-300/80 ring-1 ring-red-500/20",
                  state === "rest" && "bg-white/[0.03] text-muted-foreground/70",
                  state === "today-empty" && "bg-white/[0.04] text-white",
                  state === "future" && "text-muted-foreground/30",
                  isToday && "ring-2 ring-emerald-400/70",
                )}
              >
                {cell.date.getDate()}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[5px] bg-emerald-500/20 ring-1 ring-emerald-500/40" />
            Worked out
          </span>
          {hasSplit && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[5px] bg-red-500/10 ring-1 ring-red-500/20" />
              Missed (planned)
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[5px] bg-white/[0.03]" />
            Rest
          </span>
        </div>
      </div>
    </motion.div>
  );
}
