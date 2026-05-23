"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useExercises, useProgress, useWorkouts, type ProgressMetricType, type ProgressPoint } from "@/hooks/use-gym";

const METRIC_LABELS: Record<ProgressMetricType, { unit: string; statLabel: string; desc: string }> = {
  e1rm: { unit: "kg", statLabel: "kg (e1RM)", desc: "Estimated 1-rep max over time" },
  reps: { unit: "reps", statLabel: "reps", desc: "Max reps per session over time" },
  duration: { unit: "min", statLabel: "min", desc: "Session duration over time" },
};

function tooltipDetail(p: ProgressPoint, metricType: ProgressMetricType): string {
  if (metricType === "e1rm" && p.weight != null) {
    return `${p.weight} kg × ${p.reps ?? "?"} reps`;
  }
  if (metricType === "reps") return `${p.reps ?? p.metric} reps`;
  if (metricType === "duration") return `${p.duration ?? p.metric} min`;
  return String(p.metric);
}

export function ProgressChart() {
  const { data: exData } = useExercises();
  const { data: workoutData } = useWorkouts(50);
  const allExercises = exData?.exercises ?? [];
  const workouts = workoutData?.workouts ?? [];

  const exercisesWithData = useMemo(() => {
    const ids = new Set<string>();
    workouts.forEach((w) => w.workoutSets.forEach((s) => ids.add(s.exercise.id)));
    return allExercises.filter((e) => ids.has(e.id));
  }, [allExercises, workouts]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? exercisesWithData[0]?.id ?? null;
  const { data: progress } = useProgress(activeId);

  const metricType = progress?.metricType ?? "reps";
  const series = progress?.series ?? [];
  const selected = exercisesWithData.find((e) => e.id === activeId);
  const label = METRIC_LABELS[metricType];

  const best = series.reduce((m, s) => Math.max(m, s.metric), 0);
  const first = series[0]?.metric ?? 0;
  const last = series[series.length - 1]?.metric ?? 0;
  const change = last - first;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <TrendingUp className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-medium text-white">Progress</h3>
            <p className="text-xs text-muted-foreground">{label.desc}</p>
          </div>
        </div>
        <select
          value={activeId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={exercisesWithData.length === 0}
          className="h-9 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white focus-visible:border-emerald-500/40 focus-visible:outline-none disabled:opacity-50"
        >
          {exercisesWithData.length === 0 ? (
            <option value="">No data yet</option>
          ) : (
            exercisesWithData.map((e) => (
              <option key={e.id} value={e.id} className="bg-neutral-900">
                {e.name}
              </option>
            ))
          )}
        </select>
      </div>

      {series.length > 0 && (
        <div className="mb-4 flex items-baseline gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current</div>
            <div className="mt-1 font-mono text-2xl font-medium text-white">
              {last} <span className="text-sm text-muted-foreground">{label.unit}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Personal best</div>
            <div className="mt-1 font-mono text-2xl font-medium text-emerald-400">
              {best} <span className="text-sm text-muted-foreground">{label.unit}</span>
            </div>
          </div>
          {change !== 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">All-time change</div>
              <div className={`mt-1 font-mono text-2xl font-medium ${change > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {change > 0 ? "+" : ""}{typeof change === "number" && change % 1 !== 0 ? change.toFixed(1) : change}{" "}
                <span className="text-sm text-muted-foreground">{label.unit}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {series.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-muted-foreground">
          {selected ? `No trackable sets logged for ${selected.name} yet.` : "Log a workout to see your progress."}
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgb(138, 138, 154)", fontSize: 11 }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgb(138, 138, 154)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                width={40}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as ProgressPoint;
                  return (
                    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
                      <div className="font-medium text-white">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </div>
                      <div className="mt-0.5 font-mono text-emerald-400">
                        {p.metric} {label.unit}
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        {tooltipDetail(p, metricType)}
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="metric"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ fill: "#10B981", r: 3 }}
                activeDot={{ r: 5, fill: "#34D399", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
