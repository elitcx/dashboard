"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useCreateWorkout, useExercises } from "@/hooks/use-gym";
import type { ParsedWorkout } from "@/lib/gym-parser";
import { cn } from "@/lib/utils";

type LoggedSet = { reps: string; weight: string; duration: string };
type LoggedExercise = { name: string; sets: LoggedSet[]; exType: "strength" | "cardio"; exNotes: string };

const DAY_TYPES = ["PUSH", "PULL", "UPPER", "LOWER", "FULL_BODY", "CARDIO", "OTHER"] as const;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyExercise(): LoggedExercise {
  return { name: "", sets: [{ reps: "", weight: "", duration: "" }], exType: "strength", exNotes: "" };
}

export function WorkoutLogger({ onSaved }: { onSaved?: () => void }) {
  const { data: exData } = useExercises();
  const exercises = exData?.exercises ?? [];

  const [name, setName] = useState("Workout");
  const [date, setDate] = useState(todayString());
  const [dayType, setDayType] = useState<ParsedWorkout["dayType"]>("OTHER");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([emptyExercise()]);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateWorkout();

  function addExercise() {
    setLoggedExercises([...loggedExercises, emptyExercise()]);
  }
  function removeExercise(idx: number) {
    setLoggedExercises(loggedExercises.filter((_, i) => i !== idx));
  }
  function updateExercise(idx: number, patch: Partial<LoggedExercise>) {
    setLoggedExercises(loggedExercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)));
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

    const validExercises = loggedExercises.filter((ex) => {
      if (!ex.name.trim()) return false;
      if (ex.exType === "cardio") return !!(ex.sets[0]?.duration) || !!ex.exNotes;
      return ex.sets.some((s) => s.reps || s.weight);
    });

    if (validExercises.length === 0) {
      setError("Add at least one exercise with data.");
      return;
    }

    const sets = validExercises.flatMap((ex) => {
      if (ex.exType === "cardio") {
        return [{
          exerciseName: ex.name.trim(),
          setNumber: 1,
          reps: null,
          weight: null,
          duration: ex.sets[0]?.duration ? Number(ex.sets[0].duration) : null,
          notes: ex.exNotes || null,
        }];
      }
      return ex.sets
        .filter((s) => s.reps || s.weight)
        .map((s, i) => ({
          exerciseName: ex.name.trim(),
          setNumber: i + 1,
          reps: s.reps ? Number(s.reps) : null,
          weight: s.weight ? Number(s.weight) : null,
          duration: null,
          notes: i === 0 && ex.exNotes ? ex.exNotes : null,
        }));
    });

    try {
      await create.mutateAsync({ name, date, dayType, duration: duration ? Number(duration) : null, notes: notes || null, sets });
      setName("Workout");
      setDate(todayString());
      setDayType("OTHER");
      setDuration("");
      setNotes("");
      setLoggedExercises([emptyExercise()]);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Dumbbell className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Log workout</h3>
          <p className="text-xs text-muted-foreground">Add a workout manually, set by set</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ml-name">Name</Label>
          <Input id="ml-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ml-date">Date</Label>
          <DateTimePicker mode="date" value={date} onChange={setDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ml-type">Type</Label>
          <select
            id="ml-type"
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

      <div className="mt-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Session notes (how did it feel?)"
          rows={2}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
        />
      </div>

      <div className="mt-5 space-y-3">
        {loggedExercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Input
                value={ex.name}
                onChange={(e) => updateExercise(exIdx, { name: e.target.value })}
                placeholder="Exercise name"
                list={`exercise-list-${exIdx}`}
                className="!h-9 flex-1 font-medium"
              />
              <datalist id={`exercise-list-${exIdx}`}>
                {exercises.map((e) => (
                  <option key={e.id} value={e.name} />
                ))}
              </datalist>
              <button
                onClick={() => updateExercise(exIdx, { exType: ex.exType === "strength" ? "cardio" : "strength" })}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  ex.exType === "cardio"
                    ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30"
                    : "text-muted-foreground ring-1 ring-white/10 hover:bg-white/5 hover:text-white",
                )}
              >
                {ex.exType === "cardio" ? "Cardio" : "Strength"}
              </button>
              {loggedExercises.length > 1 && (
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {ex.exType === "cardio" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={ex.sets[0]?.duration ?? ""}
                  onChange={(e) => updateSet(exIdx, 0, { duration: e.target.value })}
                  placeholder="duration"
                  className="!h-9 w-24"
                />
                <span className="text-xs text-muted-foreground">min</span>
                <Input
                  value={ex.exNotes}
                  onChange={(e) => updateExercise(exIdx, { exNotes: e.target.value })}
                  placeholder="notes (e.g. incline: 12, speed: 5.0)"
                  className="!h-9 flex-1 text-xs"
                />
              </div>
            ) : (
              <>
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
                        placeholder="weight"
                        className="!h-9 w-24"
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
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
                <Input
                  value={ex.exNotes}
                  onChange={(e) => updateExercise(exIdx, { exNotes: e.target.value })}
                  placeholder="Exercise notes..."
                  className="!h-8 mt-2 text-xs"
                />
              </>
            )}
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
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="ml-duration" className="!mb-0">
            Duration
          </Label>
          <Input
            id="ml-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="min"
            className="!h-9 w-20"
          />
        </div>
        <Button onClick={onSubmit} disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Finish workout"}
        </Button>
      </div>
    </motion.div>
  );
}
