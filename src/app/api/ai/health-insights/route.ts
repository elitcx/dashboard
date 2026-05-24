import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TYPE = "health_daily";

async function generateInsights(userId: string, dateStr: string) {
  const date = new Date(dateStr);
  const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  const sevenDaysAgo = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 6));

  const sleepLogs = await prisma.sleepLog.findMany({
    where: { userId, date: { gte: sevenDaysAgo, lt: dayEnd } },
    orderBy: { date: "desc" },
  });

  const avgSleep =
    sleepLogs.length > 0
      ? (sleepLogs.reduce((s, l) => s + l.hoursSlept, 0) / sleepLogs.length).toFixed(1)
      : null;

  if (sleepLogs.length === 0) {
    return [{ text: "No sleep logged yet — start tracking to get personalised advice.", tone: "neutral" as const }];
  }

  const sleepHistory = sleepLogs
    .slice(0, 7)
    .map((l) => `${new Date(l.date).toLocaleDateString("en-US", { weekday: "short" })}: ${l.hoursSlept}h${l.quality ? ` (quality ${l.quality}/5)` : ""}`)
    .join(", ");

  const prompt = `You are a sleep and recovery coach. Analyse this user's recent sleep data and give 1-2 specific, actionable sleep insights.

Sleep history: ${sleepHistory}
Average: ${avgSleep}h/night over ${sleepLogs.length} logged nights
Last night: ${sleepLogs[0]?.hoursSlept}h

Look for: consistency patterns, debt accumulation, quality trends, recovery advice. Be specific about the numbers.

Return ONLY a raw JSON array (no markdown):
[{ "text": "insight here", "tone": "positive" | "neutral" | "warning" }]
Keep each insight under 20 words.`;

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
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const existing = await prisma.aIInsight.findUnique({
    where: { userId_type_cacheKey: { userId: session.user.id, type: TYPE, cacheKey: dateStr } },
  });

  if (existing) {
    return NextResponse.json({ insights: JSON.parse(existing.content), cached: true });
  }

  try {
    const insights = await generateInsights(session.user.id, dateStr);
    await prisma.aIInsight.create({
      data: { userId: session.user.id, type: TYPE, cacheKey: dateStr, content: JSON.stringify(insights) },
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

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  await prisma.aIInsight.deleteMany({
    where: { userId: session.user.id, type: TYPE, cacheKey: dateStr },
  });

  try {
    const insights = await generateInsights(session.user.id, dateStr);
    await prisma.aIInsight.create({
      data: { userId: session.user.id, type: TYPE, cacheKey: dateStr, content: JSON.stringify(insights) },
    });
    return NextResponse.json({ insights, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
