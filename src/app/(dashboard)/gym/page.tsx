"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GeminiImportPanel } from "@/components/gym/gemini-import";
import { WorkoutLogger } from "@/components/gym/workout-logger";
import { WorkoutHistory } from "@/components/gym/workout-history";
import { ProgressChart } from "@/components/gym/progress-chart";

type Tab = "import" | "log" | "history" | "progress";

const TABS: { id: Tab; label: string }[] = [
  { id: "import", label: "Import" },
  { id: "log", label: "Log Workout" },
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

      <div className="mb-6 flex w-full overflow-x-auto">
        <div className="glass inline-flex rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                tab === t.id
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              {t.label}
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
