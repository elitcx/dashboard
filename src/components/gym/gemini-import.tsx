"use client";

import { motion } from "framer-motion";
import { Sparkles, Trash2, Plus, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useParseGemini, useCreateWorkout, useExercises } from "@/hooks/use-gym";
import type { ParsedWorkout, ParsedSet } from "@/lib/gym-parser";

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

export function GeminiImportPanel({ onSaved }: { onSaved?: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setText("");
      setParsed(null);
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
        <div className="mb-4 flex items-center gap-2.5">
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

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
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
            onClick={() => setText(EXAMPLE_TEXT)}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
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

          <div className="mt-3 space-y-2">
            <Label htmlFor="workout-notes">Notes (optional)</Label>
            <textarea
              id="workout-notes"
              value={parsed.notes ?? ""}
              onChange={(e) => setParsed({ ...parsed, notes: e.target.value || undefined })}
              placeholder="How did the session feel?"
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/50 focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
            />
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
                            value={s.notes ?? ""}
                            onChange={(e) => updateSet(exIdx, sIdx, { notes: e.target.value || undefined })}
                            placeholder="notes (e.g. Incline: 12, Speed: 3.0)"
                            className="!h-9 flex-1 text-xs"
                          />
                          <Input
                            type="number"
                            value={s.duration ?? ""}
                            onChange={(e) =>
                              updateSet(exIdx, sIdx, {
                                duration: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            placeholder="min"
                            className="!h-9 w-20"
                          />
                          <span className="text-xs text-muted-foreground">min</span>
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
