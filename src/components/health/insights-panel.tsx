"use client";

import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, TrendingDown, Minus, BedDouble, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupplements, useSupplementLogs, useWater, useSleepLogs, useHabits, useHabitLogs } from "@/hooks/use-health";

type Insight = { text: string; tone: "positive" | "neutral" | "warning" };

const TONE_STYLES = {
  positive: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
  neutral: "border-white/10 bg-white/[0.02] text-muted-foreground",
  warning: "border-amber-500/20 bg-amber-500/5 text-amber-300",
};

const TONE_ICONS = {
  positive: TrendingUp,
  neutral: Minus,
  warning: TrendingDown,
};

function deriveInsights(params: {
  supplementTotal: number;
  supplementTaken: number;
  waterGlasses: number;
  waterGoal: number;
  habitTotal: number;
  habitDone: number;
}): Insight[] {
  const insights: Insight[] = [];
  const { supplementTotal, supplementTaken, waterGlasses, waterGoal, habitTotal, habitDone } = params;

  if (supplementTotal > 0) {
    const pct = supplementTaken / supplementTotal;
    if (pct === 1) {
      insights.push({ text: "All supplements taken today — great consistency!", tone: "positive" });
    } else if (pct >= 0.5) {
      insights.push({ text: `${supplementTotal - supplementTaken} supplement${supplementTotal - supplementTaken > 1 ? "s" : ""} still remaining today.`, tone: "neutral" });
    } else if (supplementTaken === 0) {
      insights.push({ text: "No supplements logged yet today.", tone: "warning" });
    }
  }

  if (waterGlasses >= waterGoal) {
    insights.push({ text: `Hydration goal hit — ${waterGlasses} glasses today!`, tone: "positive" });
  } else if (waterGlasses >= waterGoal * 0.5) {
    insights.push({ text: `${waterGoal - waterGlasses} more glasses to reach your hydration goal.`, tone: "neutral" });
  } else {
    insights.push({ text: "Hydration is low — try to drink more water today.", tone: "warning" });
  }

  if (habitTotal > 0) {
    const pct = habitDone / habitTotal;
    if (pct === 1) {
      insights.push({ text: "All habits completed today — perfect streak!", tone: "positive" });
    } else if (pct >= 0.5) {
      insights.push({ text: `${habitDone} of ${habitTotal} habits done — keep going.`, tone: "neutral" });
    } else if (habitDone === 0) {
      insights.push({ text: "No habits logged yet today.", tone: "warning" });
    }
  }

  return insights;
}

function SleepInsight() {
  const today = new Date().toISOString().slice(0, 10);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ insights: Insight[]; error?: string }>({
    queryKey: ["health-insights", today],
    queryFn: () => fetch(`/api/ai/health-insights?date=${today}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  });

  const regenerate = useMutation({
    mutationFn: () =>
      fetch(`/api/ai/health-insights?date=${today}`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => qc.setQueryData(["health-insights", today], d),
  });

  const insights: Insight[] = data && !("error" in data) ? data.insights ?? [] : [];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.75} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sleep Advice</span>
        </div>
        <button
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          title="Regenerate sleep advice"
          className="rounded-full p-1 text-muted-foreground hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn("h-3 w-3", regenerate.isPending && "animate-spin")} strokeWidth={1.75} />
        </button>
      </div>

      {isLoading || regenerate.isPending ? (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      ) : insights.length > 0 ? (
        insights.map((insight, i) => {
          const Icon = TONE_ICONS[insight.tone];
          return (
            <div key={i} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${TONE_STYLES[insight.tone]}`}>
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Log sleep to get AI advice.{" "}
            {data && "error" in data && (
              <button onClick={() => regenerate.mutate()} className="text-violet-400 underline underline-offset-2">
                Retry
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export function InsightsPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: supData } = useSupplements();
  const { data: logData } = useSupplementLogs(today);
  const { data: waterData } = useWater(today);
  const { data: habitData } = useHabits();
  const { data: habitLogData } = useHabitLogs(today);

  const insights = deriveInsights({
    supplementTotal: supData?.schedules?.length ?? 0,
    supplementTaken: logData?.logs?.length ?? 0,
    waterGlasses: waterData?.glasses ?? 0,
    waterGoal: waterData?.goal ?? 8,
    habitTotal: habitData?.habits?.length ?? 0,
    habitDone: new Set((habitLogData?.logs ?? []).map((l) => l.habitId)).size,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <Lightbulb className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Insights</h3>
          <p className="text-xs text-muted-foreground">Live health summary</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, i) => {
          const Icon = TONE_ICONS[insight.tone];
          return (
            <div key={i} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${TONE_STYLES[insight.tone]}`}>
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-5 border-t border-white/5">
        <SleepInsight />
      </div>
    </motion.div>
  );
}
