"use client";

import Link from "next/link";
import { ArrowUpRight, Wallet, Lock, Wrench, Zap, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFinanceSummary } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";

type BucketProps = { Icon: typeof Lock; label: string; remaining: number; allocated: number; locked?: boolean };

function Bucket({ Icon, label, remaining, allocated, locked }: BucketProps) {
  const pct = allocated > 0 ? Math.max(0, Math.min(100, (remaining / allocated) * 100)) : 100;
  const bar =
    locked ? "bg-slate-400"
    : pct < 25 ? "bg-rose-400"
    : pct < 50 ? "bg-amber-400"
    : "bg-emerald-400";

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-emerald-400" strokeWidth={1.75} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1.5 font-mono text-xs font-medium text-white">{fmtRp(remaining)}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function FinanceWidget({ delay = 0 }: { delay?: number }) {
  const { data, isLoading } = useFinanceSummary();
  const totals = data?.totals;
  const history = data?.history ?? [];
  const balance = history.length > 0 ? history[history.length - 1].balance : 0;
  const first = history[0]?.balance ?? 0;
  const change = balance - first;
  const goingUp = change >= 0;

  return (
    <GlassCard delay={delay} className="flex h-full flex-col">
      <Link href="/finance" className="group flex items-start justify-between">
        <div>
          <CardLabel>Total Balance</CardLabel>
          <div className="mt-2 flex items-center gap-2.5">
            <Wallet className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
            {isLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ) : (
              <div>
                <div className="font-mono text-base font-medium text-white">{fmtRp(balance)}</div>
                {history.length > 1 && (
                  <div className={cn("flex items-center gap-1 text-[10px]", goingUp ? "text-emerald-400" : "text-rose-400")}>
                    {goingUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {goingUp ? "+" : ""}{fmtRp(change)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </Link>

      {isLoading ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[Lock, Sparkles, Wrench, Zap].map((Icon, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-muted-foreground/30" strokeWidth={1.75} />
                <Skeleton className="h-2.5 w-8 rounded" />
              </div>
              <Skeleton className="mt-1.5 h-3 w-20 rounded" />
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                <Skeleton className="h-full w-[60%] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : totals ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Bucket Icon={Lock} label="Locked" remaining={totals.locked.remaining} allocated={totals.locked.allocated} locked />
          <Bucket Icon={Sparkles} label="Fun" remaining={totals.fund.remaining} allocated={totals.fund.allocated} />
          <Bucket Icon={Wrench} label="Skill" remaining={totals.skill.remaining} allocated={totals.skill.allocated} />
          <Bucket Icon={Zap} label="Flex" remaining={totals.flex.remaining} allocated={totals.flex.allocated} />
        </div>
      ) : (
        <div className="mt-5 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-muted-foreground">
          Add income on the Finance page
        </div>
      )}
    </GlassCard>
  );
}
