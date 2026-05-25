"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BedDouble,
  Check,
  ChevronDown,
  Droplet,
  Flame,
  Minus,
  Moon,
  Plus,
  Star,
  Sun,
  Sunset,
} from "lucide-react";

type BottomPanel = "sleep" | "habits" | null;
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useSupplements,
  useSupplementLogs,
  useToggleSupplement,
  useWater,
  useUpdateWater,
  useSleepLogs,
  useLogSleep,
  useHabits,
  useHabitLogs,
  useToggleHabit,
  type Habit,
  type SleepLog,
  type SupplementSchedule,
} from "@/hooks/use-health";

const expandTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
        checked
          ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
          : "border-white/20 bg-white/[0.03] text-transparent",
      )}
    >
      <Check className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );
}

function ExpandableTimeSlot({
  Icon,
  label,
  schedules,
  takenIds,
  onToggle,
}: {
  Icon: typeof Sun;
  label: string;
  schedules: SupplementSchedule[];
  takenIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = schedules.length;
  const count = schedules.filter((s) => takenIds.has(s.id)).length;
  const done = total > 0 && count === total;
  const interactive = total > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => interactive && setOpen((o) => !o)}
        disabled={!interactive}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-left transition-colors",
          done
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-white/5 bg-white/[0.02]",
          interactive && "cursor-pointer hover:border-white/15",
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon
            className={cn("h-4 w-4", done ? "text-emerald-400" : "text-muted-foreground")}
            strokeWidth={1.75}
          />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-sm",
              done ? "text-emerald-400" : "text-muted-foreground",
            )}
          >
            {total === 0 ? "—" : `${count}/${total}`}
          </span>
          {interactive && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={expandTransition}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 px-1.5 pt-1.5">
              {schedules.map((s) => {
                const taken = takenIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onToggle(s.id)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <CheckCircle checked={taken} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm transition-colors",
                        taken ? "text-muted-foreground line-through" : "text-white",
                      )}
                    >
                      {s.name}
                    </span>
                    {s.dosage && (
                      <span className="shrink-0 text-xs text-muted-foreground">{s.dosage}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SleepPanel({
  lastSleep,
  onLog,
  pending,
}: {
  lastSleep: SleepLog | undefined;
  onLog: (hours: number, quality: number) => void;
  pending: boolean;
}) {
  const [hours, setHours] = useState(lastSleep ? String(lastSleep.hoursSlept) : "7.5");
  const [quality, setQuality] = useState(lastSleep?.quality ?? 3);
  const [saved, setSaved] = useState(false);

  function submit() {
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) return;
    onLog(h, quality);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="flex items-center gap-2 pt-2">
      <input
        type="number"
        step="0.5"
        min="0"
        max="24"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className="h-7 w-14 rounded-xl border border-white/10 bg-white/5 px-1.5 text-center font-mono text-sm text-white focus:border-violet-500/40 focus:outline-none"
      />
      <span className="text-xs text-muted-foreground">hrs</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setQuality(n)} aria-label={`Quality ${n}`}>
            <Star
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                n <= quality ? "fill-amber-400 text-amber-400" : "text-white/20 hover:text-amber-400/50",
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={cn(
          "ml-auto h-7 rounded-xl border px-2.5 text-xs font-medium transition-colors",
          saved
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            : "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20",
        )}
      >
        {saved ? "Saved" : pending ? "…" : "Log"}
      </button>
    </div>
  );
}

function HabitsPanel({
  habits,
  doneIds,
  onToggle,
}: {
  habits: Habit[];
  doneIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-0.5 pt-2">
      {habits.map((h) => {
        const checked = doneIds.has(h.id);
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => onToggle(h.id)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
          >
            <CheckCircle checked={checked} />
            {h.icon && <span className="shrink-0 text-sm leading-none">{h.icon}</span>}
            <span className={cn("min-w-0 flex-1 truncate text-sm transition-colors", checked ? "text-muted-foreground line-through" : "text-white")}>
              {h.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SupplementsWidget({ delay = 0 }: { delay?: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const [openPanel, setOpenPanel] = useState<BottomPanel>(null);

  const { data: supData, isLoading } = useSupplements();
  const { data: logData } = useSupplementLogs(today);
  const { data: waterData } = useWater(today);
  const { data: sleepData } = useSleepLogs(1);
  const { data: habitData } = useHabits();
  const { data: habitLogData } = useHabitLogs(today);

  const toggleSup = useToggleSupplement(today);
  const updateWater = useUpdateWater(today);
  const toggleHabit = useToggleHabit(today);
  const logSleep = useLogSleep();

  const schedules = supData?.schedules ?? [];
  const takenIds = new Set((logData?.logs ?? []).map((l) => l.scheduleId));
  const takenTotal = takenIds.size;
  const total = schedules.length;

  const morning = schedules.filter((s) => s.timeOfDay === "MORNING");
  const evening = schedules.filter((s) => s.timeOfDay === "EVENING");
  const night = schedules.filter((s) => s.timeOfDay === "NIGHT");

  const glasses = waterData?.glasses ?? 0;
  const goal = waterData?.goal ?? 8;
  const lastSleep = sleepData?.logs?.[0];

  const habits = habitData?.habits ?? [];
  const habitDone = new Set((habitLogData?.logs ?? []).map((l) => l.habitId));
  const habitCount = habitDone.size;
  const habitTotal = habits.length;

  function togglePanel(panel: "sleep" | "habits") {
    setOpenPanel((p) => (p === panel ? null : panel));
  }

  return (
    <GlassCard delay={delay} className="flex h-full flex-col">
      <Link href="/health" className="group flex items-start justify-between">
        <div>
          <CardLabel>Health & Supplements</CardLabel>
          <div className="mt-2 flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded" />
            ) : (
              <>
                <span className="text-3xl font-medium text-white">{takenTotal}</span>
                <span className="text-lg text-muted-foreground">/ {total}</span>
                <span className="ml-1 text-sm text-muted-foreground">taken today</span>
              </>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </Link>

      {isLoading ? (
        <>
          <div className="mt-6 space-y-2.5">
            {[Sun, Sunset, Moon].map((Icon, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground/30" strokeWidth={1.75} />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-8 rounded" />
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
            {[Droplet, BedDouble, Flame].map((Icon, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground/30" strokeWidth={1.75} />
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-10 rounded" />
                  <Skeleton className="h-3.5 w-14 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 space-y-2.5">
            <ExpandableTimeSlot
              Icon={Sun}
              label="Morning"
              schedules={morning}
              takenIds={takenIds}
              onToggle={(id) => toggleSup.mutate(id)}
            />
            <ExpandableTimeSlot
              Icon={Sunset}
              label="Evening"
              schedules={evening}
              takenIds={takenIds}
              onToggle={(id) => toggleSup.mutate(id)}
            />
            <ExpandableTimeSlot
              Icon={Moon}
              label="Night"
              schedules={night}
              takenIds={takenIds}
              onToggle={(id) => toggleSup.mutate(id)}
            />
          </div>

          {/* Bottom stat grid — same compact layout as before, now interactive */}
          <div className="mt-6 border-t border-white/5 pt-5">
            <div className="grid grid-cols-3 gap-3">
              {/* Water: -/+ inline */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Droplet className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.75} />
                  <span className="text-xs text-muted-foreground">Water</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateWater.mutate(Math.max(0, glasses - 1))}
                    disabled={glasses === 0}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-sky-300 disabled:opacity-30"
                    aria-label="Remove a glass"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-center font-mono text-sm font-medium",
                      glasses >= goal ? "text-sky-400" : "text-white",
                    )}
                  >
                    {glasses}/{goal}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateWater.mutate(Math.min(30, glasses + 1))}
                    disabled={glasses >= 30}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-sky-300 transition-colors hover:bg-sky-500/10 disabled:opacity-30"
                    aria-label="Add a glass"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              {/* Sleep: tap to expand form */}
              <button
                type="button"
                onClick={() => togglePanel("sleep")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl p-1 text-left transition-colors hover:bg-white/[0.04]",
                  openPanel === "sleep" && "bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.75} />
                  <span className="text-xs text-muted-foreground">Sleep</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm font-medium text-white">
                    {lastSleep ? `${lastSleep.hoursSlept}h` : "—"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-2.5 w-2.5 text-muted-foreground transition-transform",
                      openPanel === "sleep" && "rotate-180",
                    )}
                    strokeWidth={2}
                  />
                </div>
              </button>

              {/* Habits: tap to expand checklist */}
              <button
                type="button"
                onClick={() => habitTotal > 0 && togglePanel("habits")}
                disabled={habitTotal === 0}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl p-1 text-left transition-colors",
                  habitTotal > 0 && "hover:bg-white/[0.04]",
                  openPanel === "habits" && "bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Flame
                    className={cn(
                      "h-3.5 w-3.5",
                      habitTotal > 0 && habitCount === habitTotal
                        ? "text-orange-400"
                        : "text-orange-400/70",
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="text-xs text-muted-foreground">Habits</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "font-mono text-sm font-medium",
                      habitTotal > 0 && habitCount === habitTotal
                        ? "text-orange-400"
                        : "text-white",
                    )}
                  >
                    {habitTotal === 0 ? "—" : `${habitCount}/${habitTotal}`}
                  </span>
                  {habitTotal > 0 && (
                    <ChevronDown
                      className={cn(
                        "h-2.5 w-2.5 text-muted-foreground transition-transform",
                        openPanel === "habits" && "rotate-180",
                      )}
                      strokeWidth={2}
                    />
                  )}
                </div>
              </button>
            </div>

            {/* Expandable panels — only shown on demand */}
            <AnimatePresence initial={false}>
              {openPanel === "sleep" && (
                <motion.div
                  key="sleep"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={expandTransition}
                  className="overflow-hidden"
                >
                  <SleepPanel
                    lastSleep={lastSleep}
                    onLog={(h, q) =>
                      logSleep.mutate({ date: today, hoursSlept: h, quality: q })
                    }
                    pending={logSleep.isPending}
                  />
                </motion.div>
              )}
              {openPanel === "habits" && (
                <motion.div
                  key="habits"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={expandTransition}
                  className="overflow-hidden"
                >
                  <HabitsPanel
                    habits={habits}
                    doneIds={habitDone}
                    onToggle={(id) => toggleHabit.mutate(id)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </GlassCard>
  );
}
