"use client";

import { motion } from "framer-motion";
import { Droplets, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWater, useUpdateWater } from "@/hooks/use-health";

const GLASS_GOAL = 8;

export function WaterTracker({ date }: { date?: string }) {
  const today = date ?? new Date().toISOString().slice(0, 10);
  const { data } = useWater(today);
  const update = useUpdateWater(today);

  const glasses = data?.glasses ?? 0;
  const goal = data?.goal ?? GLASS_GOAL;
  const pct = Math.min(glasses / goal, 1);

  function set(n: number) {
    update.mutate(Math.max(0, Math.min(n, 30)));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
          <Droplets className="h-4 w-4 text-sky-400" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Water Intake</h3>
          <p className="text-xs text-muted-foreground">Daily hydration goal</p>
        </div>
      </div>

      {/* Big counter */}
      <div className="mb-5 flex items-baseline gap-2">
        <span className="font-mono text-5xl font-medium text-white">{glasses}</span>
        <span className="text-xl text-muted-foreground">/ {goal} glasses</span>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-sky-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Glass grid */}
      <div className="mb-5 grid grid-cols-8 gap-1.5">
        {Array.from({ length: goal }).map((_, i) => (
          <button
            key={i}
            onClick={() => set(i < glasses ? i : i + 1)}
            className={cn(
              "aspect-square rounded-lg border transition-all",
              i < glasses
                ? "border-sky-500/40 bg-sky-500/20"
                : "border-white/10 bg-white/[0.02] hover:border-sky-500/20 hover:bg-sky-500/5",
            )}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => set(glasses - 1)}
          disabled={glasses === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-24 text-center text-sm text-muted-foreground">
          {glasses >= goal ? (
            <span className="font-medium text-sky-400">Goal reached!</span>
          ) : (
            `${goal - glasses} to go`
          )}
        </span>
        <button
          onClick={() => set(glasses + 1)}
          disabled={glasses >= 30}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
