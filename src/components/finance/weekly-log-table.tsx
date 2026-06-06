"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Table } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useFinanceConfigOrDefaults, useFinanceSummary, useWeekView, type WeeklyLogRow } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";
import { cn } from "@/lib/utils";

function fmtWeekRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

const TARGET_STYLES = {
  FUND: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  SKILL: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
  FLEX: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
};

function ExpandedWeekExpenses({ weekStart, cfg }: { weekStart: string; cfg: ReturnType<typeof useFinanceConfigOrDefaults> }) {
  const { data, isLoading } = useWeekView(weekStart);
  const expenses = data?.week?.expenses ?? [];

  const TARGET_LABEL: Record<"FUND" | "SKILL" | "FLEX", string> = {
    FUND: cfg.fundLabel,
    SKILL: cfg.skillLabel,
    FLEX: cfg.flexLabel,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">No expenses logged this week.</p>
    );
  }

  const grouped = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const d = e.date.slice(0, 10);
    if (!grouped.has(d)) grouped.set(d, []);
    grouped.get(d)!.push(e);
  }

  return (
    <div className="space-y-3 px-3 pb-4">
      {Array.from(grouped.entries()).map(([date, items]) => (
        <div key={date}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <div className="space-y-1.5">
            {items.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{e.category}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ring-1",
                        TARGET_STYLES[e.balanceTarget],
                      )}
                    >
                      {TARGET_LABEL[e.balanceTarget]}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{e.description}</p>
                  )}
                </div>
                <span className="font-mono text-xs font-medium text-white">{fmtRp(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekRow({ r, cfg }: { r: WeeklyLogRow; cfg: ReturnType<typeof useFinanceConfigOrDefaults> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
            />
            <span className="font-medium text-white">{fmtWeekRange(r.weekStart, r.weekEnd)}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-right font-mono text-emerald-300">{fmtRp(r.income)}</td>
        <td className="px-3 py-3 text-right font-mono text-muted-foreground">{fmtRp(r.locked)}</td>
        <td className="px-3 py-3 text-right font-mono text-muted-foreground">{fmtRp(r.fund)}</td>
        <td className="px-3 py-3 text-right font-mono text-muted-foreground">{fmtRp(r.skill)}</td>
        <td className="px-3 py-3 text-right font-mono text-muted-foreground">{fmtRp(r.flex)}</td>
        <td className="px-3 py-3 text-right font-mono text-rose-300">
          <span className="opacity-60">{fmtRp(r.spentFund)} / {fmtRp(r.spentSkill)} / {fmtRp(r.spentFlex)}</span>
        </td>
        <td className={cn("px-3 py-3 text-right font-mono", r.net >= 0 ? "text-white" : "text-rose-400")}>
          {r.net >= 0 ? "+" : ""}{fmtRp(r.net)}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/5 last:border-0">
          <td colSpan={8} className="bg-white/[0.015] p-0">
            <AnimatePresence initial={false}>
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <ExpandedWeekExpenses weekStart={r.weekStart} cfg={cfg} />
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>
      )}
    </>
  );
}

export function WeeklyLogTable() {
  const cfg = useFinanceConfigOrDefaults();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading } = useFinanceSummary({
    from: from || undefined,
    to: to || undefined,
  });

  const rows = data?.weeklyLog ?? [];
  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spentTotal, 0);
  const totalNet = totalIncome - totalSpent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Table className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Weekly Log</h3>
          <p className="text-xs text-muted-foreground">Click any week to see expense details</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="log-from">From</Label>
          <DateTimePicker mode="date" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="log-to">To</Label>
          <DateTimePicker mode="date" value={to} onChange={setTo} />
        </div>
      </div>

      {/* Totals summary */}
      {rows.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total income</p>
            <p className="mt-1 font-mono text-sm font-medium text-emerald-400">{fmtRp(totalIncome)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total spent</p>
            <p className="mt-1 font-mono text-sm font-medium text-rose-400">{fmtRp(totalSpent)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</p>
            <p className={cn("mt-1 font-mono text-sm font-medium", totalNet >= 0 ? "text-white" : "text-rose-400")}>
              {totalNet >= 0 ? "+" : ""}{fmtRp(totalNet)}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-10 text-center text-sm text-muted-foreground">
          No activity in this date range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Week</th>
                <th className="px-3 py-2.5 text-right font-medium">Income</th>
                <th className="px-3 py-2.5 text-right font-medium">{cfg.lockedLabel}</th>
                <th className="px-3 py-2.5 text-right font-medium">{cfg.fundLabel}</th>
                <th className="px-3 py-2.5 text-right font-medium">{cfg.skillLabel}</th>
                <th className="px-3 py-2.5 text-right font-medium">{cfg.flexLabel}</th>
                <th className="px-3 py-2.5 text-right font-medium">Spent (per bucket)</th>
                <th className="px-3 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <WeekRow key={r.weekStart} r={r} cfg={cfg} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
