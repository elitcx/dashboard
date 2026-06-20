"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trash2, Plus, ChevronRight, Dumbbell, ChevronDown, Moon } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useParseGemini, useCreateWorkout, useExercises, useSplit, useWorkouts } from "@/hooks/use-gym";
import type { ParsedWorkout, ParsedSet } from "@/lib/gym-parser";
import { WEEKDAYS, dayTypeLabel, localDateKey } from "@/lib/gym-split";
import { cn } from "@/lib/utils";

const DAY_TYPES = ["PUSH", "PULL", "UPPER", "LOWER", "FULL_BODY", "CARDIO", "OTHER"] as const;

const EXAMPLE_TEXT = `June 8 push day
felt a bit tired but pushed through

bench press 3x8 @ 80kg
incline db press 3x10 @ 22.5kg
cable fly 3x12 @ 15kg
tricep pushdown 3x12 @ 32.5kg
lateral raises 3x15 @ 8kg

30 min incline walk`;

function isCardioSet(s: ParsedSet) {
  return s.reps == null && s.weight == null;
}

function TodayPlanPanel() {
  const { data: splitData } = useSplit();
  const { data: workoutData } = useWorkouts(5);
  const todayKey = localDateKey(new Date());
  const todayWeekday = new Date().getDay();

  const today = splitData?.days.find((d) => d.weekday === todayWeekday);
  const meta = WEEKDAYS.find((w) => w.value === todayWeekday)!;
  const loggedToday = useMemo(
    () => (workoutData?.workouts ?? []).find((w) => w.date.slice(0, 10) === todayKey),
    [workoutData, todayKey],
  );

  const hasSplit = (splitData?.days.length ?? 0) > 0;

  if (!hasSplit) {
    return (
      <p className="text-xs text-muted-foreground">No split configured yet.</p>
    );
  }

  if (today?.isRest || !today) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Moon className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
        Rest day — {meta.long}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{meta.long}</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/20">
          {dayTypeLabel(today.dayType)}
        </span>
        {loggedToday && (
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
            ✓ Logged
          </span>
        )}
      </div>
      {today.exercises.length === 0 ? (
        <p className="text-xs text-muted-foreground">No exercises in today's split.</p>
      ) : (
        <ul className="space-y-1">
          {today.exercises.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
              <span className="text-xs font-medium text-white">{ex.name}</span>
              {(ex.targetSets || ex.targetReps) && (
                <span className="shrink-0 font-mono text-xs text-emerald-300">
                  {ex.targetSets ?? "—"}{ex.targetReps ? ` × ${ex.targetReps}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GeminiImportPanel({
  text,
  onTextChange,
  onSaved,
}: {
  text: string;
  onTextChange: (t: string) => void;
  onSaved?: () => void;
}) {
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);
  const [previewDuration, setPreviewDuration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const parseMut = useParseGemini();
  const createMut = useCreateWorkout();
  const { data: exData } = useExercises();
  const exerciseNames = exData?.exercises.map((e) => e.name) ?? [];

  async function onParse() {
    if (!text.trim()) return;
    setError(null);
    try {
      const res = await parseMut.mutateAsync({ text, exerciseNames });
      if (res.parsed.exercises.length === 0) {
        setError("Couldn't find any exercises. Try adding more detail to your notes.");
        setParsed(null);
        return;
      }
      setParsed(res.parsed);
      setPreviewDuration("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse");
    }
  }

  async function onSave() {
    if (!parsed) return;
    setError(null);
    try {
      await createMut.mutateAsync({
        name: parsed.name,
        date: parsed.date,
        dayType: parsed.dayType,
        notes: parsed.notes ?? null,
        duration: previewDuration ? Number(previewDuration) : null,
        sets: parsed.exercises.flatMap((ex) =>
          ex.sets.map((s, i) => ({
            exerciseName: ex.name,
            setNumber: i + 1,
            reps: s.reps ?? null,
            weight: s.weight ?? null,
            duration: s.duration ?? null,
            notes: s.notes ?? null,
          })),
        ),
      });
      onTextChange("");
      setParsed(null);
      setPreviewDuration("");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  function updateExercise(i: number, patch: Partial<ParsedWorkout["exercises"][number]>) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      exercises: parsed.exercises.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)),
    });
  }
  function removeExercise(i: number) {
    if (!parsed) return;
    setParsed({ ...parsed, exercises: parsed.exercises.filter((_, idx) => idx !== i) });
  }
  function addSet(exerciseIdx: number) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      exercises: parsed.exercises.map((ex, idx) =>
        idx === exerciseIdx
          ? { ...ex, sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1] }] }
          : ex,
      ),
    });
  }
  function updateSet(
    exerciseIdx: number,
    setIdx: number,
    patch: Partial<{ reps: number; weight: number; duration: number; notes: string }>,
  ) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      exercises: parsed.exercises.map((ex, idx) =>
        idx === exerciseIdx
          ? { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === setIdx ? { ...s, ...patch } : s)) }
          : ex,
      ),
    });
  }
  function removeSet(exerciseIdx: number, setIdx: number) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      exercises: parsed.exercises.map((ex, idx) =>
        idx === exerciseIdx
          ? { ...ex, sets: ex.sets.filter((_, sIdx) => sIdx !== setIdx) }
          : ex,
      ),
    });
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Sparkles className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-medium text-white">Quick Import</h3>
              <p className="text-xs text-muted-foreground">
                Paste your raw workout notes — Gemini will structure them for you
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPlan((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ring-1",
              showPlan
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                : "text-muted-foreground ring-white/10 hover:bg-white/5 hover:text-white",
            )}
          >
            <Dumbbell className="h-3.5 w-3.5" strokeWidth={1.75} />
            Today&apos;s plan
            <ChevronDown className={cn("h-3 w-3 transition-transform", showPlan && "rotate-180")} />
          </button>
        </div>

        <AnimatePresence>
          {showPlan && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <TodayPlanPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={EXAMPLE_TEXT}
          rows={10}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-muted-foreground/50 focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
        />

        {error && (
          <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => onTextChange(EXAMPLE_TEXT)}
            className="text-xs text-muted-foreground transition-colors hover:text-emerald-400"
          >
            Use example
          </button>
          <Button onClick={onParse} disabled={!text.trim() || parseMut.isPending} className="gap-1.5">
            {parseMut.isPending ? "Parsing..." : "Import"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {parsed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-emerald-400">Preview</div>
              <h3 className="mt-1 text-lg font-medium text-white">
                {parsed.exercises.length} exercise{parsed.exercises.length !== 1 ? "s" : ""} detected
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="workout-name">Workout name</Label>
              <Input
                id="workout-name"
                value={parsed.name}
                onChange={(e) => setParsed({ ...parsed, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout-date">Date</Label>
              <DateTimePicker mode="date" value={parsed.date} onChange={(v) => setParsed({ ...parsed, date: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout-type">Type</Label>
              <select
                id="workout-type"
                value={parsed.dayType}
                onChange={(e) => setParsed({ ...parsed, dayType: e.target.value as ParsedWorkout["dayType"] })}
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

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workout-notes">Session notes</Label>
              <textarea
                id="workout-notes"
                value={parsed.notes ?? ""}
                onChange={(e) => setParsed({ ...parsed, notes: e.target.value || undefined })}
                placeholder="How did the session feel?"
                rows={2}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/50 focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout-duration">Total duration (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="workout-duration"
                  type="number"
                  value={previewDuration}
                  onChange={(e) => setPreviewDuration(e.target.value)}
                  placeholder="min"
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {parsed.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    value={ex.name}
                    onChange={(e) => updateExercise(exIdx, { name: e.target.value })}
                    className="!h-9 flex-1 font-medium"
                  />
                  <button
                    onClick={() => removeExercise(exIdx)}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                    aria-label="Remove exercise"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {ex.sets.map((s, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 text-sm">
                      <div className="w-12 shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        {isCardioSet(s) ? "Cardio" : `Set ${sIdx + 1}`}
                      </div>
                      {isCardioSet(s) ? (
                        <>
                          <Input
                            type="number"
                            value={s.duration ?? ""}
                            onChange={(e) =>
                              updateSet(exIdx, sIdx, {
                                duration: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            placeholder="duration"
                            className="!h-9 w-24"
                          />
                          <span className="text-xs text-muted-foreground">min</span>
                          <Input
                            value={s.notes ?? ""}
                            onChange={(e) => updateSet(exIdx, sIdx, { notes: e.target.value || undefined })}
                            placeholder="notes (e.g. Incline: 12, Speed: 3.0)"
                            className="!h-9 flex-1 text-xs"
                          />
                        </>
                      ) : (
                        <>
                          <Input
                            type="number"
                            value={s.reps ?? ""}
                            onChange={(e) =>
                              updateSet(exIdx, sIdx, { reps: e.target.value ? Number(e.target.value) : undefined })
                            }
                            placeholder="reps"
                            className="!h-9 w-20"
                          />
                          <span className="text-xs text-muted-foreground">×</span>
                          <Input
                            type="number"
                            step="0.5"
                            value={s.weight ?? ""}
                            onChange={(e) =>
                              updateSet(exIdx, sIdx, { weight: e.target.value ? Number(e.target.value) : undefined })
                            }
                            placeholder="weight"
                            className="!h-9 w-24"
                          />
                          <span className="text-xs text-muted-foreground">kg</span>
                        </>
                      )}
                      <button
                        onClick={() => removeSet(exIdx, sIdx)}
                        className="ml-auto rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
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
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setParsed(null)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={createMut.isPending}>
              {createMut.isPending ? "Saving..." : "Save workout"}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
