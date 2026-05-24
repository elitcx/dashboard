"use client";

import { Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useFinanceConfigOrDefaults, type WeekView } from "@/hooks/use-finance";
import type { AllocationLabels } from "@/lib/finance-utils";

type Advice = { id: string; text: string; tone: "positive" | "neutral" | "warning" };

function deriveAdvice(income: WeekView, labels: AllocationLabels): Advice[] {
  const advice: Advice[] = [];
  const { remaining, spent, amount } = income;
  const totalSpent = spent.FUND + spent.SKILL + spent.FLEX;
  const efficiency = amount > 0 ? (amount - totalSpent) / amount : 1;

  if (efficiency >= 0.9) {
    advice.push({ id: "eff-great", text: `Excellent week — ${(efficiency * 100).toFixed(0)}% of income preserved. Well ahead of pace.`, tone: "positive" });
  } else if (efficiency >= 0.7) {
    advice.push({ id: "eff-ok", text: `${(efficiency * 100).toFixed(0)}% efficiency — solid, but watch the remaining spend.`, tone: "neutral" });
  } else {
    advice.push({ id: "eff-low", text: `Only ${(efficiency * 100).toFixed(0)}% efficiency this week — expenses are high relative to income.`, tone: "warning" });
  }

  const skillPct = income.skill > 0 ? remaining.skill / income.skill : 1;
  if (skillPct >= 0.8) {
    advice.push({ id: "skill-intact", text: `${labels.skillLabel} balance is ${(skillPct * 100).toFixed(0)}% intact — good week to invest there.`, tone: "positive" });
  } else if (skillPct < 0.3) {
    advice.push({ id: "skill-low", text: `${labels.skillLabel} budget is nearly depleted — avoid further spending from it this week.`, tone: "warning" });
  }

  const flexPct = income.flex > 0 ? remaining.flex / income.flex : 1;
  if (flexPct < 0.2) {
    advice.push({ id: "flex-low", text: `${labels.flexLabel} balance is almost gone — be mindful for the rest of the week.`, tone: "warning" });
  } else if (flexPct === 1 && spent.FLEX === 0) {
    advice.push({ id: "flex-untouched", text: `${labels.flexLabel} budget untouched so far — great discipline.`, tone: "positive" });
  }

  const fundPct = income.fund > 0 ? remaining.fund / income.fund : 1;
  if (fundPct < 0.5) {
    advice.push({ id: "fund-low", text: `More than half the ${labels.fundLabel} balance spent — protect the remainder if possible.`, tone: "warning" });
  }

  return advice.slice(0, 4);
}

const TONE = {
  positive: { cls: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300", Icon: TrendingUp },
  neutral: { cls: "border-white/10 bg-white/[0.02] text-muted-foreground", Icon: Minus },
  warning: { cls: "border-amber-500/20 bg-amber-500/5 text-amber-300", Icon: TrendingDown },
};

export function AdvicePanel({ income }: { income: WeekView }) {
  const cfg = useFinanceConfigOrDefaults();
  const advice = deriveAdvice(income, cfg);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
        <span className="text-sm font-medium text-white">This week's insights</span>
      </div>
      {advice.map((a) => {
        const { cls, Icon } = TONE[a.tone];
        return (
          <div key={a.id} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${cls}`}>
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <p className="text-sm leading-relaxed">{a.text}</p>
          </div>
        );
      })}
    </div>
  );
}
