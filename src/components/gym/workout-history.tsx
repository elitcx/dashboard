"use client";

import { motion } from "framer-motion";
import { Trash2, ChevronDown, Clock, StickyNote } from "lucide-react";
import { useState } from "react";
import { useWorkouts, useDeleteWorkout, type Workout } from "@/hooks/use-gym";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff > -7 && diff < 0) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupSetsByExercise(workout: Workout) {
  const grouped = new Map<string, { name: string; sets: typeof workout.workoutSets }>();
  for (const s of workout.workoutSets) {
    const key = s.exercise.id;
    if (!grouped.has(key)) grouped.set(key, { name: s.exercise.name, sets: [] });
    grouped.get(key)!.sets.push(s);
  }
  return Array.from(grouped.values());
}

function formatSet(s: Workout["workoutSets"][number]): string {
  if (s.reps != null && s.weight != null && s.weight > 0) {
    return `${s.weight} kg × ${s.reps} reps`;
  }
  if (s.reps != null) return `BW × ${s.reps} reps`;
  if (s.duration != null) return `${s.duration} min`;
  if (s.notes) return s.notes;
  return "—";
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);
  const del = useDeleteWorkout();
  const grouped = groupSetsByExercise(workout);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{workout.name}</span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/20">
              {workout.dayType.replace("_", " ")}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(workout.date)}</span>
            <span>·</span>
            <span>{grouped.length} exercise{grouped.length !== 1 ? "s" : ""}</span>
            {workout.duration && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {workout.duration} min
                </span>
              </>
            )}
            {workout.notes && (
              <>
                <span>·</span>
                <StickyNote className="h-3 w-3 text-muted-foreground/60" />
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="border-t border-white/5 px-5 py-4 space-y-4">
            {/* Workout notes */}
            {workout.notes && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-500/30 pl-3">
                {workout.notes}
              </p>
            )}

            {/* Exercises with per-set detail */}
            {grouped.map((g, i) => (
              <div key={i}>
                <div className="mb-1.5 text-sm font-medium text-white">{g.name}</div>
                <div className="space-y-1">
                  {g.sets.map((s, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="w-10 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
                        Set {s.setNumber}
                      </span>
                      <span className="font-mono text-white/80">{formatSet(s)}</span>
                      {s.notes && s.reps != null && (
                        <span className="text-muted-foreground/60 truncate">{s.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this workout?")) del.mutate(workout.id);
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function WorkoutHistory() {
  const { data, isLoading } = useWorkouts(30);
  const workouts = data?.workouts ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <h3 className="mb-5 text-base font-medium text-white">History</h3>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : workouts.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-12 text-center text-sm text-muted-foreground">
          No workouts yet. Log one above or paste from Gemini.
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
