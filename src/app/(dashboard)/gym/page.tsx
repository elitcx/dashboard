"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GeminiImportPanel } from "@/components/gym/gemini-import";
import { WorkoutLogger } from "@/components/gym/workout-logger";
import { WorkoutHistory } from "@/components/gym/workout-history";
import { ProgressChart } from "@/components/gym/progress-chart";
import { TodayPanel } from "@/components/gym/today-panel";
import { SplitEditor } from "@/components/gym/split-editor";
import { ConsistencyCalendar } from "@/components/gym/consistency-calendar";

type Tab = "today" | "split" | "import" | "log" | "history" | "progress" | "calendar";

const TABS: { id: Tab; label: string; shortLabel?: string }[] = [
  { id: "today", label: "Today" },
  { id: "split", label: "Split" },
  { id: "import", label: "Import" },
  { id: "log", label: "Log Workout", shortLabel: "Log" },
  { id: "history", label: "History" },
  { id: "calendar", label: "Calendar" },
  { id: "progress", label: "Progress" },
];

export default function GymPage() {
  const [tab, setTab] = useState<Tab>("today");
  const [importText, setImportText] = useState("");

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
          See today&apos;s plan, set your split, log workouts, and track consistency.
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

      {tab === "today" && (
        <TodayPanel
          onLog={() => setTab("log")}
          onImport={() => setTab("import")}
          onEditSplit={() => setTab("split")}
        />
      )}
      {tab === "split" && <SplitEditor />}
      {tab === "import" && (
        <GeminiImportPanel
          text={importText}
          onTextChange={setImportText}
          onSaved={() => setTab("history")}
        />
      )}
      {tab === "log" && <WorkoutLogger onSaved={() => setTab("history")} />}
      {tab === "history" && <WorkoutHistory />}
      {tab === "calendar" && <ConsistencyCalendar />}
      {tab === "progress" && <ProgressChart />}
    </>
  );
}
