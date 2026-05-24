"use client";

import Link from "next/link";
import { ArrowUpRight, Sun, Sunset, Moon, Droplet, BedDouble, Flame } from "lucide-react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupplements, useSupplementLogs, useWater, useSleepLogs, useHabits, useHabitLogs } from "@/hooks/use-health";

type TimeSlotProps = {
  Icon: typeof Sun;
  label: string;
  count: number;
  total: number;
};

function TimeSlot({ Icon, label, count, total }: TimeSlotProps) {
  const done = total > 0 && count === total;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-2.5",
        done ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-white/[0.02]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={cn("h-4 w-4", done ? "text-emerald-400" : "text-muted-foreground")}
          strokeWidth={1.75}
        />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <span className={cn("font-mono text-sm", done ? "text-emerald-400" : "text-muted-foreground")}>
        {total === 0 ? "—" : `${count}/${total}`}
      </span>
    </div>
  );
}

export function SupplementsWidget({ delay = 0 }: { delay?: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: supData, isLoading } = useSupplements();
  const { data: logData } = useSupplementLogs(today);
  const { data: waterData } = useWater(today);
  const { data: sleepData } = useSleepLogs(1);
  const { data: habitData } = useHabits();
  const { data: habitLogData } = useHabitLogs(today);

  const schedules = supData?.schedules ?? [];
  const takenIds = new Set((logData?.logs ?? []).map((l) => l.scheduleId));
  const takenTotal = takenIds.size;
  const total = schedules.length;

  const morning = schedules.filter((s) => s.timeOfDay === "MORNING");
  const evening = schedules.filter((s) => s.timeOfDay === "EVENING");
  const night = schedules.filter((s) => s.timeOfDay === "NIGHT");

  const count = (arr: typeof morning) => arr.filter((s) => takenIds.has(s.id)).length;

  const glasses = waterData?.glasses ?? 0;
  const goal = waterData?.goal ?? 8;
  const lastSleep = sleepData?.logs?.[0];
  const habitTotal = habitData?.habits?.length ?? 0;
  const habitDone = new Set((habitLogData?.logs ?? []).map((l) => l.habitId)).size;

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
            <TimeSlot Icon={Sun} label="Morning" count={count(morning)} total={morning.length} />
            <TimeSlot Icon={Sunset} label="Evening" count={count(evening)} total={evening.length} />
            <TimeSlot Icon={Moon} label="Night" count={count(night)} total={night.length} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
            <div className="flex items-center gap-2.5">
              <Droplet className="h-4 w-4 text-sky-400" strokeWidth={1.75} />
              <div>
                <div className="text-xs text-muted-foreground">Water</div>
                <div className="font-mono text-sm font-medium text-white">
                  {glasses} / {goal}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <BedDouble className="h-4 w-4 text-violet-400" strokeWidth={1.75} />
              <div>
                <div className="text-xs text-muted-foreground">Sleep</div>
                <div className="font-mono text-sm font-medium text-white">
                  {lastSleep ? `${lastSleep.hoursSlept}h` : "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Flame className="h-4 w-4 text-orange-400" strokeWidth={1.75} />
              <div>
                <div className="text-xs text-muted-foreground">Habits</div>
                <div className="font-mono text-sm font-medium text-white">
                  {habitTotal === 0 ? "—" : `${habitDone} / ${habitTotal}`}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );
}
