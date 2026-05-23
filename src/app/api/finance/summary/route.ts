import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allocate, weekStart } from "@/lib/finance-utils";

// Returns:
//   totals       — all-time allocated/spent/remaining per bucket + total income/spent
//   history      — daily cumulative balance points (total income to date − total spent to date)
//   weeklyLog    — per-week summary rows (income, allocations, spent per bucket)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // optional YYYY-MM-DD
  const to = searchParams.get("to");     // optional YYYY-MM-DD

  const dateFilter: { gte?: Date; lt?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const t = new Date(to);
    t.setUTCDate(t.getUTCDate() + 1); // inclusive end
    dateFilter.lt = t;
  }

  const [entries, expenses] = await Promise.all([
    prisma.incomeEntry.findMany({
      where: { userId: session.user.id, ...(from || to ? { date: dateFilter } : {}) },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId: session.user.id, ...(from || to ? { date: dateFilter } : {}) },
      orderBy: { date: "asc" },
    }),
  ]);

  // ───── Totals (all-time, or within filter window if applied) ──────
  const totalIncome = entries.reduce((s, e) => s + e.amount, 0);
  const totalSpentByBucket = { FUND: 0, SKILL: 0, FLEX: 0 };
  for (const e of expenses) totalSpentByBucket[e.balanceTarget] += e.amount;
  const totalSpent = totalSpentByBucket.FUND + totalSpentByBucket.SKILL + totalSpentByBucket.FLEX;

  const allocAll = allocate(totalIncome);

  const totals = {
    totalIncome,
    totalSpent,
    locked: { allocated: allocAll.locked, spent: 0, remaining: allocAll.locked },
    fund: { allocated: allocAll.fund, spent: totalSpentByBucket.FUND, remaining: +(allocAll.fund - totalSpentByBucket.FUND).toFixed(2) },
    skill: { allocated: allocAll.skill, spent: totalSpentByBucket.SKILL, remaining: +(allocAll.skill - totalSpentByBucket.SKILL).toFixed(2) },
    flex: { allocated: allocAll.flex, spent: totalSpentByBucket.FLEX, remaining: +(allocAll.flex - totalSpentByBucket.FLEX).toFixed(2) },
  };

  // ───── Balance history (one point per day where activity occurred) ─────
  // Build a sorted timeline of (date, delta). Income adds, expenses subtract.
  const events: { date: string; delta: number }[] = [];
  for (const e of entries) events.push({ date: e.date.toISOString().slice(0, 10), delta: e.amount });
  for (const e of expenses) events.push({ date: e.date.toISOString().slice(0, 10), delta: -e.amount });
  events.sort((a, b) => a.date.localeCompare(b.date));

  const byDay = new Map<string, number>();
  for (const ev of events) byDay.set(ev.date, (byDay.get(ev.date) ?? 0) + ev.delta);

  let running = 0;
  const history: { date: string; balance: number }[] = [];
  for (const [date, delta] of Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    running += delta;
    history.push({ date, balance: +running.toFixed(2) });
  }

  // ───── Weekly log: aggregate by Monday-week ─────
  function mondayOf(d: Date): string {
    const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = u.getUTCDay();
    u.setUTCDate(u.getUTCDate() + (day === 0 ? -6 : 1 - day));
    return u.toISOString().slice(0, 10);
  }

  type WeekRow = {
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

  const weekMap = new Map<string, WeekRow>();
  function getRow(weekMondayStr: string): WeekRow {
    let row = weekMap.get(weekMondayStr);
    if (!row) {
      const start = new Date(weekMondayStr);
      const endD = new Date(start);
      endD.setUTCDate(endD.getUTCDate() + 6);
      row = {
        weekStart: weekMondayStr,
        weekEnd: endD.toISOString().slice(0, 10),
        income: 0, locked: 0, fund: 0, skill: 0, flex: 0,
        spentFund: 0, spentSkill: 0, spentFlex: 0, spentTotal: 0, net: 0,
      };
      weekMap.set(weekMondayStr, row);
    }
    return row;
  }

  for (const e of entries) {
    const row = getRow(mondayOf(e.date));
    row.income += e.amount;
  }
  for (const e of expenses) {
    const row = getRow(mondayOf(e.date));
    if (e.balanceTarget === "FUND") row.spentFund += e.amount;
    else if (e.balanceTarget === "SKILL") row.spentSkill += e.amount;
    else if (e.balanceTarget === "FLEX") row.spentFlex += e.amount;
    row.spentTotal += e.amount;
  }
  // Allocate income per week and compute net
  for (const row of weekMap.values()) {
    const a = allocate(row.income);
    row.locked = a.locked;
    row.fund = a.fund;
    row.skill = a.skill;
    row.flex = a.flex;
    row.net = +(row.income - row.spentTotal).toFixed(2);
  }

  const weeklyLog = Array.from(weekMap.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return NextResponse.json({ totals, history, weeklyLog });
}
