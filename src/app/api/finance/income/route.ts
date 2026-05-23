import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { weekStart, weekEnd, allocate } from "@/lib/finance-utils";

// GET /api/finance/income?week=YYYY-MM-DD
//   Returns the aggregated weekly view: income entries within the week,
//   computed allocations, expenses within the week, per-bucket spent + remaining.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const start = weekParam ? new Date(weekParam) : weekStart();
  const end = weekEnd(start);
  // Inclusive-end boundary: end of Sunday
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const [entries, expenses] = await Promise.all([
    prisma.incomeEntry.findMany({
      where: { userId: session.user.id, date: { gte: start, lt: endExclusive } },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { userId: session.user.id, date: { gte: start, lt: endExclusive } },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalIncome = entries.reduce((s, e) => s + e.amount, 0);

  // If no income for the week, return a zero-allocated frame so the UI can still display
  if (entries.length === 0 && expenses.length === 0) {
    return NextResponse.json({ week: null });
  }

  const { locked, fund, skill, flex } = allocate(totalIncome);

  const spent = { FUND: 0, SKILL: 0, FLEX: 0 };
  for (const e of expenses) spent[e.balanceTarget] += e.amount;

  return NextResponse.json({
    week: {
      weekStart: start.toISOString().slice(0, 10),
      weekEnd: end.toISOString().slice(0, 10),
      amount: totalIncome,
      locked,
      fund,
      skill,
      flex,
      remaining: {
        locked,
        fund: +(fund - spent.FUND).toFixed(2),
        skill: +(skill - spent.SKILL).toFixed(2),
        flex: +(flex - spent.FLEX).toFixed(2),
      },
      spent,
      entries: entries.map((e) => ({
        id: e.id,
        amount: e.amount,
        source: e.source,
        date: e.date.toISOString().slice(0, 10),
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        category: e.category,
        balanceTarget: e.balanceTarget,
        description: e.description,
        date: e.date.toISOString().slice(0, 10),
      })),
    },
  });
}

const CreateSchema = z.object({
  amount: z.number().positive(),
  source: z.string().max(60).optional(),
  date: z.string().optional(), // YYYY-MM-DD; defaults to today
});

// POST — create a new income entry
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { amount, source, date: dateStr } = parsed.data;
  const date = dateStr ? new Date(dateStr) : new Date();
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const entry = await prisma.incomeEntry.create({
    data: {
      userId: session.user.id,
      amount,
      source: source ?? null,
      date: dayStart,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
