"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinanceSummary } from "@/hooks/use-finance";
import { fmtRp } from "@/lib/finance-utils";

export function TotalBalanceChart() {
  const { data, isLoading } = useFinanceSummary();
  const history = data?.history ?? [];
  const currentBalance = history.length > 0 ? history[history.length - 1].balance : 0;
  const first = history[0]?.balance ?? 0;
  const change = currentBalance - first;
  const goingUp = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total balance
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-medium text-white sm:text-4xl">
              {fmtRp(currentBalance)}
            </span>
            {history.length > 1 && (
              <span
                className={`flex items-center gap-1 font-mono text-sm ${
                  goingUp ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {goingUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {goingUp ? "+" : ""}
                {fmtRp(change)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative income minus expenses
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-muted-foreground">
          Add your first income or expense to see your balance over time.
        </div>
      ) : (
        <div className="h-40 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
                tick={{ fill: "rgb(138,138,154)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tickFormatter={(v) => {
                  const n = Number(v);
                  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
                  return String(n);
                }}
                tick={{ fill: "rgb(138,138,154)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { date: string; balance: number };
                  return (
                    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
                      <div className="font-medium text-white">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="mt-0.5 font-mono text-emerald-400">{fmtRp(p.balance)}</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#balanceFill)"
                activeDot={{ r: 4, fill: "#34D399", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
