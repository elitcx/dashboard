"use client";

import { motion } from "framer-motion";
import { SupplementChecklist } from "@/components/health/supplement-checklist";
import { WaterTracker } from "@/components/health/water-tracker";
import { SleepLogger } from "@/components/health/sleep-logger";
import { InsightsPanel } from "@/components/health/insights-panel";
import { HabitChecklist } from "@/components/health/habit-checklist";

export default function HealthPage() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">Health</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Supplements, hydration, sleep, and daily insights.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <InsightsPanel />
        </div>
        <SupplementChecklist />
        <div className="space-y-6">
          <WaterTracker />
          <SleepLogger />
        </div>
        <div className="lg:col-span-2">
          <HabitChecklist />
        </div>
      </div>
    </>
  );
}
