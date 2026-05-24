"use client";

import { motion } from "framer-motion";
import { Lock, Sparkles, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceConfigOrDefaults, type WeekView } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";

type BucketDef = {
  key: keyof WeekView["remaining"];
  spentKey?: keyof WeekView["spent"];
  labelKey: "lockedLabel" | "fundLabel" | "skillLabel" | "flexLabel";
  Icon: typeof Lock;
  color: string;
  ring: string;
  bar: string;
  locked?: boolean;
};

const BUCKETS: BucketDef[] = [
  {
    key: "locked",
    labelKey: "lockedLabel",
    Icon: Lock,
    color: "text-slate-300",
    ring: "ring-slate-500/20",
    bar: "from-slate-500 to-slate-400",
    locked: true,
  },
  {
    key: "fund",
    spentKey: "FUND",
    labelKey: "fundLabel",
    Icon: Sparkles,
    color: "text-emerald-400",
    ring: "ring-emerald-500/20",
    bar: "from-emerald-500 to-emerald-400",
  },
  {
    key: "skill",
    spentKey: "SKILL",
    labelKey: "skillLabel",
    Icon: Wrench,
    color: "text-blue-400",
    ring: "ring-blue-500/20",
    bar: "from-blue-500 to-blue-400",
  },
  {
    key: "flex",
    spentKey: "FLEX",
    labelKey: "flexLabel",
    Icon: Zap,
    color: "text-amber-400",
    ring: "ring-amber-500/20",
    bar: "from-amber-500 to-yellow-400",
  },
];

function BucketCard({ bucket, income, label, lockedHint }: { bucket: BucketDef; income: WeekView; label: string; lockedHint?: string }) {
  const allocated = bucket.locked ? income.locked : income[bucket.key as keyof typeof income] as number;
  const remaining = income.remaining[bucket.key];
  const spent = bucket.spentKey ? income.spent[bucket.spentKey] : 0;
  const pct = allocated > 0 ? Math.max(0, Math.min(100, (remaining / allocated) * 100)) : 100;

  const barColor =
    bucket.locked ? bucket.bar
    : pct < 25 ? "from-red-500 to-orange-400"
    : pct < 50 ? "from-amber-500 to-yellow-400"
    : bucket.bar;

  const { Icon } = bucket;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ${bucket.ring}`}>
          <Icon className={`h-4 w-4 ${bucket.color}`} strokeWidth={1.75} />
        </div>
        <span className="truncate text-sm font-medium text-white">{label}</span>
      </div>

      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-xl font-medium text-white">{fmtRp(remaining)}</span>
        <span className="text-xs text-muted-foreground">of {fmtRp(allocated)}</span>
      </div>

      {!bucket.locked && (
        <p className="mb-3 text-xs text-muted-foreground">
          {fmtRp(spent)} spent
        </p>
      )}
      {bucket.locked && lockedHint && (
        <p className="mb-3 text-xs text-muted-foreground">{lockedHint}</p>
      )}

      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-1.5 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</div>
    </div>
  );
}

export function BalanceCards({ income }: { income: WeekView }) {
  const cfg = useFinanceConfigOrDefaults();
  const totalSpent = income.spent.FUND + income.spent.SKILL + income.spent.FLEX;
  const efficiency = income.amount > 0
    ? ((income.amount - totalSpent) / income.amount) * 100
    : 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BUCKETS.map((b) => (
          <BucketCard
            key={b.key}
            bucket={b}
            income={income}
            label={cfg[b.labelKey]}
            lockedHint={b.locked ? cfg.lockedDesc : undefined}
          />
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-3.5">
        <div>
          <span className="text-sm text-muted-foreground">Weekly efficiency</span>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            {fmtRp(totalSpent)} spent of {fmtRp(income.amount)}
          </p>
        </div>
        <span
          className={cn(
            "font-mono text-2xl font-medium",
            efficiency >= 80 ? "text-emerald-400" : efficiency >= 50 ? "text-amber-400" : "text-red-400",
          )}
        >
          {efficiency.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
