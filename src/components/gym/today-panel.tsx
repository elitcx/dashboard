"use client";

import { motion } from "framer-motion";
import { Dumbbell, Moon, CheckCircle2, ClipboardList, PenLine, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import { useSplit, useWorkouts } from "@/hooks/use-gym";
import { Button } from "@/components/ui/button";
import { WEEKDAYS, dayTypeLabel, localDateKey } from "@/lib/gym-split";

export function TodayPanel({
  onLog,
  onImport,
  onEditSplit,
}: {
  onLog: () => void;
  onImport: () => void;
  onEditSplit: () => void;
}) {
  const { data: splitData, isLoading: splitLoading } = useSplit();
  const { data: workoutData } = useWorkouts(10);

  const todayKey = localDateKey(new Date());
  const todayWeekday = new Date().getDay();

  const today = splitData?.days.find((d) => d.weekday === todayWeekday);
  const meta = WEEKDAYS.find((w) => w.value === todayWeekday)!;

  const loggedToday = useMemo(
    () => (workoutData?.workouts ?? []).find((w) => w.date.slice(0, 10) === todayKey),
    [workoutData, todayKey],
  );

  const hasSplit = (splitData?.days.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {meta.long}
          </div>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-medium text-white">
            {!hasSplit ? (
              "Today"
            ) : today?.isRest || !today ? (
              <>
                <Moon className="h-5 w-5 text-sky-300" strokeWidth={1.75} />
                Rest day
              </>
            ) : (
              <>
                <Dumbbell className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
                {today.label || dayTypeLabel(today.dayType)}
              </>
            )}
          </h3>
        </div>
        {loggedToday && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Logged
          </span>
        )}
      </div>

      {splitLoading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : !hasSplit ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            No split yet. Set up your weekly plan to see today&apos;s exercises here.
          </p>
          <Button size="sm" className="mt-4" onClick={onEditSplit}>
            Set up split
          </Button>
        </div>
      ) : today?.isRest || !today ? (
        <p className="text-sm text-muted-foreground">
          Nothing planned today — recover well. Worked out anyway?{" "}
          <button onClick={onLog} className="text-emerald-300 underline-offset-2 hover:underline">
            Log it
          </button>
          .
        </p>
      ) : (
        <>
          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/20">
            {dayTypeLabel(today.dayType)}
          </span>

          {today.exercises.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No exercises planned for this day.{" "}
              <button
                onClick={onEditSplit}
                className="text-emerald-300 underline-offset-2 hover:underline"
              >
                Add some
              </button>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {today.exercises.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                    {ex.name}
                  </span>
                  {(ex.targetSets || ex.targetReps) && (
                    <span className="shrink-0 font-mono text-sm text-emerald-300">
                      {ex.targetSets ?? "—"}
                      {ex.targetReps ? ` × ${ex.targetReps}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onImport}>
          <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
          Import workout
        </Button>
        <Button size="sm" variant="outline" onClick={onLog}>
          <PenLine className="mr-1.5 h-3.5 w-3.5" />
          Log manually
        </Button>
        {hasSplit && (
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onEditSplit();
            }}
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-white"
          >
            Edit split
          </Link>
        )}
      </div>
    </motion.div>
  );
}
