"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeleteExpense, useFinanceConfigOrDefaults, type Expense } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";

const TARGET_STYLES = {
  FUND: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  SKILL: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
  FLEX: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
};

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const del = useDeleteExpense();
  const cfg = useFinanceConfigOrDefaults();
  const TARGET_LABEL: Record<"FUND" | "SKILL" | "FLEX", string> = {
    FUND: cfg.fundLabel,
    SKILL: cfg.skillLabel,
    FLEX: cfg.flexLabel,
  };

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-10 text-center text-sm text-muted-foreground">
        No expenses logged this week.
      </div>
    );
  }

  // Group by date
  const grouped = new Map<string, Expense[]>();
  for (const e of expenses) {
    const d = e.date.slice(0, 10);
    if (!grouped.has(d)) grouped.set(d, []);
    grouped.get(d)!.push(e);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([date, items]) => (
        <div key={date}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <div className="space-y-2">
            {items.map((e) => (
              <div
                key={e.id}
                className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{e.category}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1",
                        TARGET_STYLES[e.balanceTarget],
                      )}
                    >
                      {TARGET_LABEL[e.balanceTarget]}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{e.description}</p>
                  )}
                </div>
                <span className="font-mono text-sm font-medium text-white">{fmtRp(e.amount)}</span>
                <button
                  onClick={() => del.mutate(e.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
