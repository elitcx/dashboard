import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getWeekStart(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // roll back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function generateSummary(userId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);

  const [incomeEntries, expenses, workouts, supplementSchedules, supplementLogs, sleepLogs, waterLogs, habits, habitLogs] =
    await Promise.all([
      prisma.incomeEntry.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.workout.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        include: { workoutSets: { include: { exercise: true } } },
      }),
      prisma.supplementSchedule.findMany({ where: { userId, isActive: true } }),
      prisma.supplementLog.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.sleepLog.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.waterLog.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.habit.findMany({ where: { userId, isActive: true } }),
      prisma.habitLog.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
    ]);

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const totalSupplements = supplementSchedules.length * 7;
  const takenSupplements = supplementLogs.length;

  const avgSleep =
    sleepLogs.length > 0
      ? (sleepLogs.reduce((s, l) => s + l.hoursSlept, 0) / sleepLogs.length).toFixed(1)
      : null;

  const avgWater =
    waterLogs.length > 0
      ? Math.round(waterLogs.reduce((s, l) => s + l.glasses, 0) / waterLogs.length)
      : null;

  const totalHabitOpportunities = habits.length * 7;
  const completedHabits = habitLogs.length;

  const workoutNames = workouts.map((w) => w.name).join(", ") || "none";

  const prompt = `You are a personal health and finance assistant. Generate a brief, encouraging weekly summary for a user based on their data from the past week.

Weekly data:
- Finance: earned Rp ${Math.round(totalIncome).toLocaleString("id-ID")}, spent Rp ${Math.round(totalSpent).toLocaleString("id-ID")}, net Rp ${Math.round(totalIncome - totalSpent).toLocaleString("id-ID")}
- Workouts: ${workouts.length} session(s) — ${workoutNames}
- Supplements: ${takenSupplements} of ${totalSupplements} possible doses taken (${totalSupplements > 0 ? Math.round((takenSupplements / totalSupplements) * 100) : 0}%)
- Sleep: ${avgSleep ? `avg ${avgSleep} hours/night over ${sleepLogs.length} logged night(s)` : "no sleep logged"}
- Water: ${avgWater ? `avg ${avgWater} glasses/day` : "no water logged"}
- Habits: ${completedHabits} of ${totalHabitOpportunities} possible completions (${totalHabitOpportunities > 0 ? Math.round((completedHabits / totalHabitOpportunities) * 100) : 0}%)

Respond with a JSON object (no markdown, just raw JSON) in this exact format:
{
  "summary": "2-3 sentence narrative summary of the week, personal and motivating",
  "highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4"]
}

Keep highlights concise (under 10 words each). Be specific about the numbers. Acknowledge both wins and areas to improve.`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const json = JSON.parse(text.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
  return { summary: json.summary as string, highlights: json.highlights as string[] };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = getWeekStart();

  const existing = await prisma.weeklySummary.findUnique({
    where: { userId_weekStartDate: { userId: session.user.id, weekStartDate: weekStart } },
  });

  if (existing) {
    return NextResponse.json({
      summary: existing.summary,
      highlights: JSON.parse(existing.highlights),
      generatedAt: existing.generatedAt,
      cached: true,
    });
  }

  try {
    const { summary, highlights } = await generateSummary(session.user.id, weekStart);
    const record = await prisma.weeklySummary.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStart,
        summary,
        highlights: JSON.stringify(highlights),
      },
    });
    return NextResponse.json({
      summary: record.summary,
      highlights,
      generatedAt: record.generatedAt,
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Weekly summary generation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = getWeekStart();

  await prisma.weeklySummary.deleteMany({
    where: { userId: session.user.id, weekStartDate: weekStart },
  });

  try {
    const { summary, highlights } = await generateSummary(session.user.id, weekStart);
    const record = await prisma.weeklySummary.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStart,
        summary,
        highlights: JSON.stringify(highlights),
      },
    });
    return NextResponse.json({
      summary: record.summary,
      highlights,
      generatedAt: record.generatedAt,
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Weekly summary regeneration failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
