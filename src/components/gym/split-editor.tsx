"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, Check, Dumbbell, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSplit, useUpdateSplit, useExercises, type SplitDayInput } from "@/hooks/use-gym";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DAY_TYPES, WEEKDAYS, dayTypeLabel } from "@/lib/gym-split";
import type { ParsedWorkout } from "@/lib/gym-parser";

type PlanExercise = { name: string; targetSets: string; targetReps: string };
type PlanDay = {
  weekday: number;
  label: string;
  dayType: ParsedWorkout["dayType"];
  isRest: boolean;
  exercises: PlanExercise[];
};

function emptyDays(): PlanDay[] {
  return WEEKDAYS.map((w) => ({
    weekday: w.value,
    label: "",
    dayType: "OTHER" as const,
    isRest: true,
    exercises: [],
  }));
}

export function SplitEditor() {
  const { data, isLoading } = useSplit();
  const { data: exData } = useExercises();
  const update = useUpdateSplit();
  const knownExercises = exData?.exercises ?? [];

  const [days, setDays] = useState<PlanDay[]>(emptyDays());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate local state once the split loads.
  useEffect(() => {
    if (!data) return;
    const byWeekday = new Map(data.days.map((d) => [d.weekday, d]));
    setDays(
      WEEKDAYS.map((w) => {
        const d = byWeekday.get(w.value);
        if (!d) {
          return { weekday: w.value, label: "", dayType: "OTHER" as const, isRest: true, exercises: [] };
        }
        return {
          weekday: w.value,
          label: d.label,
          dayType: d.dayType,
          isRest: d.isRest,
          exercises: d.exercises.map((e) => ({
            name: e.name,
            targetSets: e.targetSets?.toString() ?? "",
            targetReps: e.targetReps ?? "",
          })),
        };
      }),
    );
  }, [data]);

  function patchDay(weekday: number, patch: Partial<PlanDay>) {
    setSaved(false);
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }
  function addExercise(weekday: number) {
    patchDayExercises(weekday, (ex) => [...ex, { name: "", targetSets: "", targetReps: "" }]);
  }
  function removeExercise(weekday: number, idx: number) {
    patchDayExercises(weekday, (ex) => ex.filter((_, i) => i !== idx));
  }
  function updateExercise(weekday: number, idx: number, patch: Partial<PlanExercise>) {
    patchDayExercises(weekday, (ex) => ex.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function patchDayExercises(weekday: number, fn: (ex: PlanExercise[]) => PlanExercise[]) {
    setSaved(false);
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, exercises: fn(d.exercises) } : d)));
  }

  async function onSave() {
    setError(null);
    const payload: SplitDayInput[] = days.map((d) => ({
      weekday: d.weekday,
      label: d.label.trim(),
      dayType: d.dayType,
      isRest: d.isRest,
      exercises: d.isRest
        ? []
        : d.exercises
            .filter((e) => e.name.trim())
            .map((e) => ({
              name: e.name.trim(),
              targetSets: e.targetSets ? Number(e.targetSets) : null,
              targetReps: e.targetReps.trim() || null,
            })),
    }));
    try {
      await update.mutateAsync(payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save split");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-white">Weekly split</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Set your plan once. Each day shows on the Today tab.
          </p>
        </div>
        <Button size="sm" onClick={onSave} disabled={update.isPending}>
          <Check className="mr-1 h-3.5 w-3.5" />
          {update.isPending ? "Saving..." : saved ? "Saved" : "Save split"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const meta = WEEKDAYS.find((w) => w.value === d.weekday)!;
            return (
              <div
                key={d.weekday}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  d.isRest ? "border-white/5 bg-white/[0.01]" : "border-white/5 bg-white/[0.02]",
                )}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="w-10 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {meta.short}
                  </span>

                  <button
                    onClick={() => patchDay(d.weekday, { isRest: !d.isRest })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      d.isRest
                        ? "bg-white/5 text-muted-foreground hover:text-white"
                        : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
                    )}
                  >
                    {d.isRest ? <Moon className="h-3 w-3" /> : <Dumbbell className="h-3 w-3" />}
                    {d.isRest ? "Rest" : "Training"}
                  </button>

                  {!d.isRest && (
                    <>
                      <Input
                        value={d.label}
                        onChange={(e) => patchDay(d.weekday, { label: e.target.value })}
                        placeholder="Label (e.g. Push Day)"
                        className="!h-9 min-w-0 flex-1"
                      />
                      <select
                        value={d.dayType}
                        onChange={(e) =>
                          patchDay(d.weekday, { dayType: e.target.value as ParsedWorkout["dayType"] })
                        }
                        className="h-9 shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs text-white focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                      >
                        {DAY_TYPES.map((t) => (
                          <option key={t} value={t} className="bg-neutral-900">
                            {dayTypeLabel(t)}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                {!d.isRest && (
                  <div className="mt-3 space-y-1.5 pl-12">
                    {d.exercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={ex.name}
                          onChange={(e) => updateExercise(d.weekday, idx, { name: e.target.value })}
                          placeholder="Exercise"
                          list={`split-ex-${d.weekday}`}
                          className="!h-9 flex-1"
                        />
                        <Input
                          value={ex.targetSets}
                          onChange={(e) => updateExercise(d.weekday, idx, { targetSets: e.target.value })}
                          placeholder="sets"
                          type="number"
                          className="!h-9 w-16"
                        />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          value={ex.targetReps}
                          onChange={(e) => updateExercise(d.weekday, idx, { targetReps: e.target.value })}
                          placeholder="reps"
                          className="!h-9 w-20"
                        />
                        <button
                          onClick={() => removeExercise(d.weekday, idx)}
                          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addExercise(d.weekday)}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-emerald-400"
                    >
                      <Plus className="h-3 w-3" />
                      Add exercise
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {/* one datalist per day, all sharing the same known-exercise options */}
          {days.map((d) => (
            <datalist key={`dl-${d.weekday}`} id={`split-ex-${d.weekday}`}>
              {knownExercises.map((e) => (
                <option key={e.id} value={e.name} />
              ))}
            </datalist>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}
    </motion.div>
  );
}
