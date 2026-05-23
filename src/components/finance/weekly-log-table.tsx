"use client";

import { motion } from "framer-motion";
import { Table } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useFinanceSummary } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";
import { cn } from "@/lib/utils";

function fmtWeekRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function WeeklyLogTable() {
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
          <p className="text-xs text-muted-foreground">Income, allocations, and spending per week</p>
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
                <th className="px-3 py-2.5 text-right font-medium">Locked</th>
                <th className="px-3 py-2.5 text-right font-medium">Fun</th>
                <th className="px-3 py-2.5 text-right font-medium">Skill</th>
                <th className="px-3 py-2.5 text-right font-medium">Flex</th>
                <th className="px-3 py-2.5 text-right font-medium">Spent (Fun/Sk/Fl)</th>
                <th className="px-3 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.weekStart} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3 py-3 font-medium text-white">{fmtWeekRange(r.weekStart, r.weekEnd)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
