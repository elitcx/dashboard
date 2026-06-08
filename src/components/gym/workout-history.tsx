"use client";

import { motion } from "framer-motion";
import { Trash2, ChevronDown, Clock, StickyNote, Pencil, Plus, X, Check } from "lucide-react";
import { useState } from "react";
import { useWorkouts, useDeleteWorkout, useUpdateWorkout, type Workout } from "@/hooks/use-gym";
import { useExercises } from "@/hooks/use-gym";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";
import type { ParsedWorkout } from "@/lib/gym-parser";

type LoggedSet = { reps: string; weight: string; duration: string };
type LoggedExercise = { name: string; sets: LoggedSet[] };

const DAY_TYPES = ["PUSH", "PULL", "UPPER", "LOWER", "FULL_BODY", "CARDIO", "OTHER"] as const;

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

function workoutToForm(workout: Workout) {
  const grouped = groupSetsByExercise(workout);
  return {
    name: workout.name,
    date: workout.date.slice(0, 10),
    dayType: workout.dayType as ParsedWorkout["dayType"],
    duration: workout.duration?.toString() ?? "",
    exercises: grouped.map((g) => ({
      name: g.name,
      sets: g.sets.map((s) => ({
        reps: s.reps?.toString() ?? "",
        weight: s.weight?.toString() ?? "",
        duration: s.duration?.toString() ?? "",
      })),
    })),
  };
}

function WorkoutEditForm({
  workout,
  onSave,
  onCancel,
}: {
  workout: Workout;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { data: exData } = useExercises();
  const exercises = exData?.exercises ?? [];
  const update = useUpdateWorkout();

  const initial = workoutToForm(workout);
  const [name, setName] = useState(initial.name);
  const [date, setDate] = useState(initial.date);
  const [dayType, setDayType] = useState(initial.dayType);
  const [duration, setDuration] = useState(initial.duration);
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>(initial.exercises);
  const [error, setError] = useState<string | null>(null);

  function addExercise() {
    setLoggedExercises([...loggedExercises, { name: "", sets: [{ reps: "", weight: "", duration: "" }] }]);
  }
  function removeExercise(idx: number) {
    setLoggedExercises(loggedExercises.filter((_, i) => i !== idx));
  }
  function updateExerciseName(idx: number, val: string) {
    setLoggedExercises(loggedExercises.map((ex, i) => (i === idx ? { ...ex, name: val } : ex)));
  }
  function addSet(exIdx: number) {
    setLoggedExercises(
      loggedExercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1] ?? { reps: "", weight: "", duration: "" };
        return { ...ex, sets: [...ex.sets, { ...last }] };
      }),
    );
  }
  function removeSet(exIdx: number, setIdx: number) {
    setLoggedExercises(
      loggedExercises.map((ex, i) =>
        i === exIdx ? { ...ex, sets: ex.sets.filter((_, sI) => sI !== setIdx) } : ex,
      ),
    );
  }
  function updateSet(exIdx: number, setIdx: number, patch: Partial<LoggedSet>) {
    setLoggedExercises(
      loggedExercises.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, sI) => (sI === setIdx ? { ...s, ...patch } : s)) }
          : ex,
      ),
    );
  }

  async function onSubmit() {
    setError(null);
    const validExercises = loggedExercises.filter(
      (ex) => ex.name.trim() && ex.sets.some((s) => s.reps || s.weight || s.duration),
    );
    if (validExercises.length === 0) {
      setError("Add at least one exercise with sets.");
      return;
    }

    const sets = validExercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.reps || s.weight || s.duration)
        .map((s, i) => ({
          exerciseName: ex.name.trim(),
          setNumber: i + 1,
          reps: s.reps ? Number(s.reps) : null,
          weight: s.weight ? Number(s.weight) : null,
          duration: s.duration ? Number(s.duration) : null,
        })),
    );

    try {
      await update.mutateAsync({
        id: workout.id,
        name,
        date,
        dayType,
        duration: duration ? Number(duration) : null,
        sets,
      });
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <div className="border-t border-white/5 px-5 py-4 space-y-4">
      {/* Header fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workout name"
            className="font-medium"
          />
        </div>
        <div>
          <DateTimePicker mode="date" value={date} onChange={setDate} />
        </div>
        <div>
          <select
            value={dayType}
            onChange={(e) => setDayType(e.target.value as ParsedWorkout["dayType"])}
            className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          >
            {DAY_TYPES.map((d) => (
              <option key={d} value={d} className="bg-neutral-900">
                {d.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {loggedExercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Input
                value={ex.name}
                onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                placeholder="Exercise name"
                list={`edit-ex-list-${exIdx}`}
                className="!h-9 flex-1 font-medium"
              />
              <datalist id={`edit-ex-list-${exIdx}`}>
                {exercises.map((e) => (
                  <option key={e.id} value={e.name} />
                ))}
              </datalist>
              {loggedExercises.length > 1 && (
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {ex.sets.map((s, sIdx) => (
                <div key={sIdx} className="flex items-center gap-2 text-sm">
                  <div className="w-12 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Set {sIdx + 1}
                  </div>
                  <Input
                    type="number"
                    value={s.reps}
                    onChange={(e) => updateSet(exIdx, sIdx, { reps: e.target.value })}
                    placeholder="reps"
                    className="!h-9 w-20"
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={s.weight}
                    onChange={(e) => updateSet(exIdx, sIdx, { weight: e.target.value })}
                    placeholder="kg"
                    className="!h-9 w-24"
                  />
                  <Input
                    type="number"
                    value={s.duration}
                    onChange={(e) => updateSet(exIdx, sIdx, { duration: e.target.value })}
                    placeholder="min"
                    className="!h-9 w-20"
                  />
                  {ex.sets.length > 1 && (
                    <button
                      onClick={() => removeSet(exIdx, sIdx)}
                      className="ml-auto rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addSet(exIdx)}
                className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-emerald-400"
              >
                <Plus className="h-3 w-3" />
                Add set
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addExercise}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Duration</span>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="min"
            className="!h-9 w-20"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <Button size="sm" onClick={onSubmit} disabled={update.isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const del = useDeleteWorkout();
  const grouped = groupSetsByExercise(workout);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <button
        onClick={() => {
          if (!editing) setExpanded((v) => !v);
        }}
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
            expanded && !editing && "rotate-180",
          )}
        />
      </button>

      {(expanded || editing) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          {editing ? (
            <WorkoutEditForm
              workout={workout}
              onSave={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="border-t border-white/5 px-5 py-4 space-y-4">
              {workout.notes && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-500/30 pl-3">
                  {workout.notes}
                </p>
              )}

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

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
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
          )}
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
