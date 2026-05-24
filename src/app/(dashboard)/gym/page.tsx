"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GeminiImportPanel } from "@/components/gym/gemini-import";
import { WorkoutLogger } from "@/components/gym/workout-logger";
import { WorkoutHistory } from "@/components/gym/workout-history";
import { ProgressChart } from "@/components/gym/progress-chart";

type Tab = "import" | "log" | "history" | "progress";

const TABS: { id: Tab; label: string; shortLabel?: string }[] = [
  { id: "import", label: "Import" },
  { id: "log", label: "Log Workout", shortLabel: "Log" },
  { id: "history", label: "History" },
  { id: "progress", label: "Progress" },
];

export default function GymPage() {
  const [tab, setTab] = useState<Tab>("import");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">Gym</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Paste a Gemini summary, log manually, or track your progress.
        </p>
      </motion.div>

      <div className="mb-6 -mx-4 flex w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-full sm:px-0">
        <div className="glass inline-flex rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-4 sm:py-2 sm:text-sm",
                tab === t.id
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              {t.shortLabel ? (
                <>
                  <span className="sm:hidden">{t.shortLabel}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </>
              ) : (
                t.label
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "import" && <GeminiImportPanel onSaved={() => setTab("history")} />}
      {tab === "log" && <WorkoutLogger onSaved={() => setTab("history")} />}
      {tab === "history" && <WorkoutHistory />}
      {tab === "progress" && <ProgressChart />}
    </>
  );
}
