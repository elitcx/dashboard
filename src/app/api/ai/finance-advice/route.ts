import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_FINANCE_CONFIG } from "@/lib/finance-utils";

const TYPE = "finance_weekly";

function rp(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

async function generateAdvice(userId: string, weekStr: string) {
  const weekStart = new Date(weekStr);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const fourWeeksAgo = new Date(weekStart.getTime() - 28 * 86_400_000);

  const [incomeEntries, weekExpenses, financeConfig, allIncome, allExpenses] = await Promise.all([
    prisma.incomeEntry.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
    prisma.expense.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
    prisma.financeConfig.findUnique({ where: { userId } }),
    prisma.incomeEntry.findMany({ where: { userId, date: { gte: fourWeeksAgo, lt: weekStart } } }),
    prisma.expense.findMany({ where: { userId, date: { gte: fourWeeksAgo, lt: weekStart } } }),
  ]);

  const cfg = financeConfig ?? DEFAULT_FINANCE_CONFIG;
  const income = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const spentFund = weekExpenses.filter((e) => e.balanceTarget === "FUND").reduce((s, e) => s + e.amount, 0);
  const spentSkill = weekExpenses.filter((e) => e.balanceTarget === "SKILL").reduce((s, e) => s + e.amount, 0);
  const spentFlex = weekExpenses.filter((e) => e.balanceTarget === "FLEX").reduce((s, e) => s + e.amount, 0);
  const totalSpent = spentFund + spentSkill + spentFlex;

  const avgWeeklyIncome = allIncome.reduce((s, e) => s + e.amount, 0) / 4;
  const avgWeeklySpend = allExpenses.reduce((s, e) => s + e.amount, 0) / 4;

  const allocFund = income * (cfg.fundPct / 100);
  const allocSkill = income * (cfg.skillPct / 100);
  const allocFlex = income * (cfg.flexPct / 100);
  const noIncome = income === 0;

  const prompt = noIncome
    ? `You are a personal finance advisor. The user tracks finances in Indonesian Rupiah (IDR). They haven't logged income for the week of ${weekStr}, but have historical data.

Last 4-week averages (prior weeks):
- Average weekly income: ${rp(avgWeeklyIncome)}
- Average weekly spending: ${rp(avgWeeklySpend)}
- Savings rate: ${avgWeeklyIncome > 0 ? (((avgWeeklyIncome - avgWeeklySpend) / avgWeeklyIncome) * 100).toFixed(0) : 0}%

Bucket allocations: "${cfg.lockedLabel}" ${cfg.lockedPct}%, "${cfg.fundLabel}" ${cfg.fundPct}%, "${cfg.skillLabel}" ${cfg.skillPct}%, "${cfg.flexLabel}" ${cfg.flexPct}%

Give 3 actionable financial insights based on their spending patterns and allocation strategy. Be specific and practical.

Return ONLY a raw JSON array (no markdown):
[{ "text": "insight here", "tone": "positive" | "neutral" | "warning" }]
Keep each insight under 20 words. Use Rp for amounts.`
    : `You are a personal finance advisor. The user tracks finances in Indonesian Rupiah (IDR). Analyse this week and give 3-4 specific, actionable insights — identify patterns, flag risks, suggest concrete next steps.

Week of ${weekStr}:
- Income: ${rp(income)}
- Total spent: ${rp(totalSpent)} (${((totalSpent / income) * 100).toFixed(0)}% of income)
- "${cfg.fundLabel}" (${cfg.fundPct}%): ${rp(spentFund)} spent of ${rp(allocFund)} — ${rp(allocFund - spentFund)} remaining
- "${cfg.skillLabel}" (${cfg.skillPct}%): ${rp(spentSkill)} spent of ${rp(allocSkill)} — ${rp(allocSkill - spentSkill)} remaining
- "${cfg.flexLabel}" (${cfg.flexPct}%): ${rp(spentFlex)} spent of ${rp(allocFlex)} — ${rp(allocFlex - spentFlex)} remaining
- "${cfg.lockedLabel}" saved: ${rp(income * (cfg.lockedPct / 100))} (untouched)
- 4-week avg income: ${rp(avgWeeklyIncome)} | avg spend: ${rp(avgWeeklySpend)}

Think about: burn rate, which buckets are at risk, savings rate vs history, and what to prioritise.

Return ONLY a raw JSON array (no markdown):
[{ "text": "insight here", "tone": "positive" | "neutral" | "warning" }]
Keep each insight under 20 words. Use actual bucket names. Use Rp for amounts.`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(text) as { text: string; tone: "positive" | "neutral" | "warning" }[];
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekStr = searchParams.get("week");
  if (!weekStr) return NextResponse.json({ error: "Missing week param" }, { status: 400 });

  const existing = await prisma.aIInsight.findUnique({
    where: { userId_type_cacheKey: { userId: session.user.id, type: TYPE, cacheKey: weekStr } },
  });

  if (existing) {
    return NextResponse.json({ insights: JSON.parse(existing.content), cached: true });
  }

  try {
    const insights = await generateAdvice(session.user.id, weekStr);
    await prisma.aIInsight.create({
      data: { userId: session.user.id, type: TYPE, cacheKey: weekStr, content: JSON.stringify(insights) },
    });
    return NextResponse.json({ insights, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const weekStr: string = body.week;
  if (!weekStr) return NextResponse.json({ error: "Missing week" }, { status: 400 });

  await prisma.aIInsight.deleteMany({
    where: { userId: session.user.id, type: TYPE, cacheKey: weekStr },
  });

  try {
    const insights = await generateAdvice(session.user.id, weekStr);
    await prisma.aIInsight.create({
      data: { userId: session.user.id, type: TYPE, cacheKey: weekStr, content: JSON.stringify(insights) },
    });
    return NextResponse.json({ insights, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
