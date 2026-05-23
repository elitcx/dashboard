"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Expense = {
  id: string;
  amount: number;
  category: string;
  balanceTarget: "FUND" | "SKILL" | "FLEX";
  description: string | null;
  date: string;
};

export type IncomeEntry = {
  id: string;
  amount: number;
  source: string | null;
  date: string;
};

export type WeekView = {
  weekStart: string;
  weekEnd: string;
  amount: number;
  locked: number;
  fund: number;
  skill: number;
  flex: number;
  remaining: { locked: number; fund: number; skill: number; flex: number };
  spent: { FUND: number; SKILL: number; FLEX: number };
  entries: IncomeEntry[];
  expenses: Expense[];
};

export type BucketTotal = { allocated: number; spent: number; remaining: number };

export type FinanceTotals = {
  totalIncome: number;
  totalSpent: number;
  locked: BucketTotal;
  fund: BucketTotal;
  skill: BucketTotal;
  flex: BucketTotal;
};

export type WeeklyLogRow = {
  weekStart: string;
  weekEnd: string;
  income: number;
  locked: number;
  fund: number;
  skill: number;
  flex: number;
  spentFund: number;
  spentSkill: number;
  spentFlex: number;
  spentTotal: number;
  net: number;
};

export type FinanceSummary = {
  totals: FinanceTotals;
  history: { date: string; balance: number }[];
  weeklyLog: WeeklyLogRow[];
};

function currentWeekMonday() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Weekly view ───────────────────────────────────────────────────────

export function useWeekView(week?: string) {
  const w = week ?? currentWeekMonday();
  return useQuery<{ week: WeekView | null }>({
    queryKey: ["finance-week", w],
    queryFn: () => fetch(`/api/finance/income?week=${w}`).then((r) => r.json()),
  });
}

// ── Income entries ────────────────────────────────────────────────────

export function useAddIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; source?: string; date?: string }) =>
      fetch("/api/finance/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-week"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/finance/income/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-week"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

// ── Expenses ──────────────────────────────────────────────────────────

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      category: string;
      balanceTarget: "FUND" | "SKILL" | "FLEX";
      description?: string;
      date?: string;
    }) =>
      fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-week"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/finance/expenses/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-week"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

// ── Summary (all-time totals + history + weekly log) ──────────────────

export function useFinanceSummary(opts?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  const qs = params.toString();
  const key = ["finance-summary", opts?.from ?? "", opts?.to ?? ""];
  return useQuery<FinanceSummary>({
    queryKey: key,
    queryFn: () => fetch(`/api/finance/summary${qs ? `?${qs}` : ""}`).then((r) => r.json()),
  });
}
