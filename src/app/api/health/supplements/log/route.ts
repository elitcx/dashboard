import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ToggleSchema = z.object({
  scheduleId: z.string(),
  date: z.string(), // ISO date string YYYY-MM-DD
});

// GET /api/health/supplements/log?date=YYYY-MM-DD
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const logs = await prisma.supplementLog.findMany({
    where: { userId: session.user.id, date: { gte: dayStart, lt: dayEnd } },
    select: { scheduleId: true, id: true },
  });

  return NextResponse.json({ logs });
}

// POST — toggle a supplement log for a given date
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ToggleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scheduleId, date: dateStr } = parsed.data;
  const date = new Date(dateStr);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const existing = await prisma.supplementLog.findFirst({
    where: { scheduleId, userId: session.user.id, date: { gte: dayStart, lt: dayEnd } },
  });

  if (existing) {
    await prisma.supplementLog.delete({ where: { id: existing.id } });
    return NextResponse.json({ taken: false });
  } else {
    await prisma.supplementLog.create({
      data: { userId: session.user.id, scheduleId, date: dayStart },
    });
    return NextResponse.json({ taken: true });
  }
}
