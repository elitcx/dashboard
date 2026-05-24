"use client";

import { motion } from "framer-motion";
import { Lock, Sparkles, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceConfigOrDefaults, type FinanceTotals } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";

type BucketDef = {
  key: "locked" | "fund" | "skill" | "flex";
  labelKey: "lockedLabel" | "fundLabel" | "skillLabel" | "flexLabel";
  Icon: typeof Lock;
  color: string;
  ring: string;
  locked?: boolean;
};

const BUCKETS: BucketDef[] = [
  { key: "locked", labelKey: "lockedLabel", Icon: Lock, color: "text-slate-300", ring: "ring-slate-500/20", locked: true },
  { key: "fund", labelKey: "fundLabel", Icon: Sparkles, color: "text-emerald-400", ring: "ring-emerald-500/20" },
  { key: "skill", labelKey: "skillLabel", Icon: Wrench, color: "text-blue-400", ring: "ring-blue-500/20" },
  { key: "flex", labelKey: "flexLabel", Icon: Zap, color: "text-amber-400", ring: "ring-amber-500/20" },
];

export function TotalBalanceCards({ totals }: { totals: FinanceTotals }) {
  const cfg = useFinanceConfigOrDefaults();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {BUCKETS.map((b) => {
        const bucket = totals[b.key];
        const pct = bucket.allocated > 0
          ? Math.max(0, Math.min(100, (bucket.remaining / bucket.allocated) * 100))
          : 100;
        return (
          <div key={b.key} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1", b.ring)}>
                <b.Icon className={cn("h-3.5 w-3.5", b.color)} strokeWidth={1.75} />
              </div>
              <span className="truncate text-xs font-medium text-white">{cfg[b.labelKey]}</span>
            </div>
            <p className="font-mono text-base font-medium text-white">{fmtRp(bucket.remaining)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              of {fmtRp(bucket.allocated)} {b.locked ? "saved" : "left"}
            </p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  b.locked ? "bg-slate-400"
                  : pct < 25 ? "bg-rose-400"
                  : pct < 50 ? "bg-amber-400"
                  : "bg-emerald-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
