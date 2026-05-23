"use client";

import { motion } from "framer-motion";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useAddIncome, useDeleteIncome, type IncomeEntry } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";

function defaultDateInWeek(week: string) {
  // If the selected week contains today, default to today; otherwise the Monday of that week.
  const today = new Date().toISOString().slice(0, 10);
  const monday = new Date(week);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const todayD = new Date(today);
  if (todayD >= monday && todayD <= sunday) return today;
  return week;
}

export function IncomeForm({
  week,
  entries,
}: {
  week: string;
  entries: IncomeEntry[];
}) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(defaultDateInWeek(week));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const add = useAddIncome();
  const del = useDeleteIncome();

  async function submit() {
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    await add.mutateAsync({ amount: amt, source: source.trim() || undefined, date });
    setAmount("");
    setSource("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Wallet className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium text-white">Income This Week</h3>
          <p className="text-xs text-muted-foreground">
            {entries.length === 0 ? "No income logged yet" : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} · ${fmtRp(total)} total`}
          </p>
        </div>
      </div>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="mb-5 space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-white">{fmtRp(e.amount)}</span>
                  {e.source && <span className="text-xs text-muted-foreground">· {e.source}</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => del.mutate(e.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add entry form */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="inc-amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted-foreground">Rp</span>
            <Input
              id="inc-amount"
              type="number"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>
        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="inc-source">Source (optional)</Label>
          <Input
            id="inc-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Salary, Freelance"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="inc-date">Date</Label>
          <DateTimePicker mode="date" value={date} onChange={setDate} />
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={add.isPending} className={saved ? "bg-emerald-600/60" : ""}>
          <Plus className="mr-1.5 h-4 w-4" />
          {saved ? "Added!" : add.isPending ? "Adding..." : "Add income"}
        </Button>
      </div>
    </motion.div>
  );
}
