"use client";

import Link from "next/link";
import { ArrowUpRight, Dumbbell } from "lucide-react";
import { useMemo } from "react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkouts } from "@/hooks/use-gym";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff > -7 && diff < 0) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function GymWidget({ delay = 0 }: { delay?: number }) {
  const { data, isLoading } = useWorkouts(5);
  const workouts = data?.workouts ?? [];
  const last = workouts[0];

  // Top exercises from the last workout — one row per unique exercise, any type
  const topLifts = useMemo(() => {
    if (!last) return [];
    const seen = new Set<string>();
    const lifts: Array<{ name: string; stat: string }> = [];
    for (const s of last.workoutSets) {
      if (seen.has(s.exercise.id)) continue;
      seen.add(s.exercise.id);

      let stat: string;
      if (s.weight != null && s.weight > 0) {
        stat = s.reps ? `${s.weight} kg × ${s.reps}` : `${s.weight} kg`;
      } else if (s.reps != null) {
        stat = `BW × ${s.reps}`;
      } else if (s.duration != null) {
        stat = `${s.duration} min`;
      } else if (s.notes) {
        stat = s.notes.split(",")[0]; // first property e.g. "Incline: 12"
      } else {
        stat = "—";
      }

      lifts.push({ name: s.exercise.name, stat });
      if (lifts.length >= 3) break;
    }
    return lifts;
  }, [last]);

  return (
    <GlassCard delay={delay} className="flex h-full flex-col">
      <Link href="/gym" className="group flex items-start justify-between">
        <div>
          <CardLabel>Gym</CardLabel>
          <div className="mt-2 flex items-center gap-2.5">
            <Dumbbell className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
            {isLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ) : last ? (
              <div>
                <div className="text-sm font-medium text-white">{last.name}</div>
                <div className="text-xs text-muted-foreground">{formatDate(last.date)}</div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No workouts yet</span>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </Link>

      <div className="mt-6 flex-1 space-y-2.5">
        {isLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <Skeleton className="h-3 w-[45%]" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            ))}
          </>
        ) : !last ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-4 text-center text-sm text-muted-foreground">
            Log your first workout
            <br />
            on the Gym page
          </div>
        ) : topLifts.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-muted-foreground">
            No exercises logged
          </div>
        ) : (
          topLifts.map((lift, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                {lift.name}
              </div>
              <span className="shrink-0 font-mono text-sm text-emerald-300">
                {lift.stat}
              </span>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
