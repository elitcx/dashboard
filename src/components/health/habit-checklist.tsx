"use client";

import { motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useHabits,
  useHabitLogs,
  useToggleHabit,
  useCreateHabit,
  useDeleteHabit,
  type Habit,
} from "@/hooks/use-health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function HabitItem({
  habit,
  done,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3">
      <button
        onClick={onToggle}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
          done
            ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
            : "border-white/20 bg-white/[0.03] text-transparent hover:border-emerald-500/40",
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {habit.icon && <span className="text-base leading-none">{habit.icon}</span>}
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            done ? "text-muted-foreground line-through" : "text-white",
          )}
        >
          {habit.name}
        </span>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddHabitForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const create = useCreateHabit();

  async function submit() {
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), icon: icon.trim() || undefined });
    setName("");
    setIcon("");
    onDone();
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        placeholder="🏃"
        className="!h-8 w-12 text-center text-sm"
        maxLength={2}
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name"
        className="!h-8 flex-1 text-sm"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <Button size="sm" onClick={submit} disabled={create.isPending} className="h-8 px-3 text-xs">
        Add
      </Button>
      <button onClick={onDone} className="text-xs text-muted-foreground hover:text-white">
        Cancel
      </button>
    </div>
  );
}

export function HabitChecklist({ date }: { date?: string }) {
  const today = date ?? new Date().toISOString().slice(0, 10);
  const [adding, setAdding] = useState(false);
  const { data: habitData, isLoading } = useHabits();
  const { data: logData } = useHabitLogs(today);
  const toggle = useToggleHabit(today);
  const del = useDeleteHabit();

  const habits = habitData?.habits ?? [];
  const doneIds = new Set((logData?.logs ?? []).map((l) => l.habitId));
  const doneCount = doneIds.size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-white">Daily Habits</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {doneCount} of {habits.length} done today
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-20 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          {habits.length === 0 && !adding ? (
            <p className="text-xs text-muted-foreground">No habits yet — click + to add one</p>
          ) : (
            <div className="space-y-2.5">
              {habits.map((h) => (
                <HabitItem
                  key={h.id}
                  habit={h}
                  done={doneIds.has(h.id)}
                  onToggle={() => toggle.mutate(h.id)}
                  onDelete={() => del.mutate(h.id)}
                />
              ))}
            </div>
          )}
          {adding && (
            <div className={habits.length > 0 ? "mt-3" : ""}>
              <AddHabitForm onDone={() => setAdding(false)} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
