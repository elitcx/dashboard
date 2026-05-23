"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeekView, useFinanceSummary } from "@/hooks/use-finance";
import { Skeleton } from "@/components/ui/skeleton";
import { IncomeForm } from "@/components/finance/income-form";
import { BalanceCards } from "@/components/finance/balance-cards";
import { ExpenseLogger } from "@/components/finance/expense-logger";
import { ExpenseList } from "@/components/finance/expense-list";
import { AdvicePanel } from "@/components/finance/advice-panel";
import { TotalBalanceChart } from "@/components/finance/total-balance-chart";
import { TotalBalanceCards } from "@/components/finance/total-balance-cards";
import { WeeklyLogTable } from "@/components/finance/weekly-log-table";

function mondayOf(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addWeeks(date: Date, n: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d;
}

function weekLabel(start: Date) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

type Tab = "weekly" | "log";

const TABS: { id: Tab; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "log", label: "Log" },
];

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const baseMonday = mondayOf(new Date());
  const currentMonday = addWeeks(baseMonday, weekOffset);
  const weekStr = currentMonday.toISOString().slice(0, 10);

  const { data: weekData, isLoading } = useWeekView(weekStr);
  const week = weekData?.week ?? null;
  const isCurrentWeek = weekOffset === 0;

  const { data: summary } = useFinanceSummary();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">Finance</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Weekly income engine — Locked · Fun · Skill · Flex
        </p>
      </motion.div>

      {/* Always-visible top: total balance chart + all-time bucket cards */}
      <div className="mb-6 space-y-4">
        <TotalBalanceChart />
        {summary?.totals && <TotalBalanceCards totals={summary.totals} />}
      </div>

      {/* Tabs */}
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

      {tab === "weekly" && (
        <>
          {/* Week navigator */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-white">{weekLabel(currentMonday)}</p>
              {isCurrentWeek && <p className="text-xs text-emerald-400">Current week</p>}
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={weekOffset >= 0}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="glass rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-6 w-24 rounded" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                    <Skeleton className="h-2.5 w-12 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                    <div className="h-1 overflow-hidden rounded-full bg-white/5">
                      <Skeleton className="h-full w-[55%] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <IncomeForm week={weekStr} entries={week?.entries ?? []} />
              {week && week.amount > 0 ? (
                <>
                  <BalanceCards income={week} />
                  <AdvicePanel income={week} />
                </>
              ) : (
                <div className="rounded-3xl border border-white/5 bg-white/[0.02] py-12 text-center text-sm text-muted-foreground">
                  Add income above to see your balance breakdown.
                </div>
              )}
              <ExpenseLogger />
              <div className="glass rounded-3xl p-6">
                <h3 className="mb-4 text-base font-medium text-white">
                  {isCurrentWeek ? "This week's expenses" : "Expenses for this week"}
                </h3>
                <ExpenseList expenses={week?.expenses ?? []} />
              </div>
            </div>
          )}
        </>
      )}

      {tab === "log" && <WeeklyLogTable />}
    </>
  );
}
