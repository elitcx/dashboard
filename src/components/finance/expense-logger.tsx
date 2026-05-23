"use client";

import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useAddExpense } from "@/hooks/use-finance";

const CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Shopping",
  "Entertainment",
  "Course / Book",
  "Software / Tools",
  "Health",
  "Subscriptions",
  "Other",
];

const TARGETS = [
  { value: "FUND" as const, label: "Fun", desc: "Fun activities & extras" },
  { value: "SKILL" as const, label: "Skill", desc: "Learning & self-improvement" },
  { value: "FLEX" as const, label: "Flex", desc: "Day-to-day spending" },
];

export function ExpenseLogger() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food & Drink");
  const [customCategory, setCustomCategory] = useState("");
  const [balanceTarget, setBalanceTarget] = useState<"FUND" | "SKILL" | "FLEX">("FLEX");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const add = useAddExpense();
  const finalCategory = category === "Other" ? customCategory : category;

  async function submit() {
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!finalCategory.trim()) { setError("Choose or enter a category."); return; }

    await add.mutateAsync({
      amount: amt,
      category: finalCategory.trim(),
      balanceTarget,
      description: description.trim() || undefined,
      date,
    });

    setAmount("");
    setDescription("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20">
          <Receipt className="h-4 w-4 text-rose-400" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Log Expense</h3>
          <p className="text-xs text-muted-foreground">Assign to a balance bucket</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="exp-amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted-foreground">Rp</span>
            <Input
              id="exp-amount"
              type="number"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="pl-10"
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="exp-date">Date</Label>
          <DateTimePicker mode="date" value={date} onChange={setDate} />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="exp-cat">Category</Label>
          <select
            id="exp-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white focus-visible:border-emerald-500/40 focus-visible:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-neutral-900">{c}</option>
            ))}
          </select>
        </div>

        {/* Custom category */}
        {category === "Other" && (
          <div className="space-y-2">
            <Label htmlFor="exp-custom">Custom category</Label>
            <Input
              id="exp-custom"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g. Gym membership"
            />
          </div>
        )}

        {/* Description */}
        <div className={`space-y-2 ${category !== "Other" ? "sm:col-span-2" : ""}`}>
          <Label htmlFor="exp-desc">Description (optional)</Label>
          <Input
            id="exp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was it for?"
          />
        </div>
      </div>

      {/* Balance target */}
      <div className="mt-4 space-y-2">
        <Label>Deduct from</Label>
        <div className="grid grid-cols-3 gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              onClick={() => setBalanceTarget(t.value)}
              className={`rounded-2xl border px-3 py-2.5 text-left transition-all ${
                balanceTarget === t.value
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-white"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="mt-0.5 text-[10px] leading-tight opacity-70">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={submit} disabled={add.isPending} className={saved ? "bg-emerald-600/60" : ""}>
          {saved ? "Logged!" : add.isPending ? "Saving..." : "Log expense"}
        </Button>
      </div>
    </motion.div>
  );
}
