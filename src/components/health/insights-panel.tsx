"use client";

import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSupplements, useSupplementLogs, useWater, useSleepLogs } from "@/hooks/use-health";

type Insight = {
  id: string;
  text: string;
  tone: "positive" | "neutral" | "warning";
};

function deriveInsights(params: {
  supplementTotal: number;
  supplementTaken: number;
  waterGlasses: number;
  waterGoal: number;
  sleepLogs: { hoursSlept: number; quality: number | null }[];
}): Insight[] {
  const insights: Insight[] = [];
  const { supplementTotal, supplementTaken, waterGlasses, waterGoal, sleepLogs } = params;

  // Supplements
  if (supplementTotal > 0) {
    const pct = supplementTaken / supplementTotal;
    if (pct === 1) {
      insights.push({ id: "sup-done", text: "All supplements taken today — great consistency!", tone: "positive" });
    } else if (pct >= 0.5) {
      insights.push({ id: "sup-partial", text: `${supplementTotal - supplementTaken} supplement${supplementTotal - supplementTaken > 1 ? "s" : ""} still remaining today.`, tone: "neutral" });
    } else if (supplementTotal > 0 && supplementTaken === 0) {
      insights.push({ id: "sup-none", text: "No supplements logged yet today.", tone: "warning" });
    }
  } else {
    insights.push({ id: "sup-empty", text: "Add your supplement schedule to track daily intake.", tone: "neutral" });
  }

  // Water
  if (waterGlasses >= waterGoal) {
    insights.push({ id: "water-done", text: `Hydration goal hit — ${waterGlasses} glasses today!`, tone: "positive" });
  } else if (waterGlasses >= waterGoal * 0.5) {
    insights.push({ id: "water-half", text: `${waterGoal - waterGlasses} more glasses to reach your hydration goal.`, tone: "neutral" });
  } else {
    insights.push({ id: "water-low", text: "Hydration is low — try to drink more water today.", tone: "warning" });
  }

  // Sleep
  if (sleepLogs.length >= 3) {
    const avg = sleepLogs.reduce((s, l) => s + l.hoursSlept, 0) / sleepLogs.length;
    const last = sleepLogs[0]?.hoursSlept ?? 0;
    if (avg >= 7.5) {
      insights.push({ id: "sleep-great", text: `Solid sleep average of ${avg.toFixed(1)}h over the last ${sleepLogs.length} nights.`, tone: "positive" });
    } else if (avg >= 6) {
      insights.push({ id: "sleep-ok", text: `Sleep average is ${avg.toFixed(1)}h — aim for 7-9h for optimal recovery.`, tone: "neutral" });
    } else {
      insights.push({ id: "sleep-low", text: `Sleep average is only ${avg.toFixed(1)}h — prioritise rest for better performance.`, tone: "warning" });
    }
    if (last < 6 && avg >= 7) {
      insights.push({ id: "sleep-off", text: "Last night was shorter than usual — listen to your body today.", tone: "warning" });
    }
  } else if (sleepLogs.length === 0) {
    insights.push({ id: "sleep-empty", text: "Start logging sleep to see recovery insights.", tone: "neutral" });
  }

  return insights.slice(0, 4);
}

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

export function InsightsPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: supData } = useSupplements();
  const { data: logData } = useSupplementLogs(today);
  const { data: waterData } = useWater(today);
  const { data: sleepData } = useSleepLogs(7);

  const insights = deriveInsights({
    supplementTotal: supData?.schedules?.length ?? 0,
    supplementTaken: logData?.logs?.length ?? 0,
    waterGlasses: waterData?.glasses ?? 0,
    waterGoal: waterData?.goal ?? 8,
    sleepLogs: sleepData?.logs ?? [],
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
          <p className="text-xs text-muted-foreground">Daily health summary</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight) => {
          const Icon = TONE_ICONS[insight.tone];
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${TONE_STYLES[insight.tone]}`}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
