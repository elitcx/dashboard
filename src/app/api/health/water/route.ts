import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// GET /api/health/water?date=YYYY-MM-DD
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : todayUTC();
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const log = await prisma.waterLog.findUnique({
    where: { userId_date: { userId: session.user.id, date: dayStart } },
  });

  return NextResponse.json({ glasses: log?.glasses ?? 0, goal: log?.goal ?? 8 });
}

const UpdateSchema = z.object({
  glasses: z.number().int().min(0).max(30),
  goal: z.number().int().min(1).max(30).optional(),
  date: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { glasses, goal, date: dateStr } = parsed.data;
  const date = dateStr ? new Date(dateStr) : todayUTC();
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const log = await prisma.waterLog.upsert({
    where: { userId_date: { userId: session.user.id, date: dayStart } },
    update: { glasses, ...(goal !== undefined && { goal }) },
    create: { userId: session.user.id, date: dayStart, glasses, goal: goal ?? 8 },
  });

  return NextResponse.json({ glasses: log.glasses, goal: log.goal });
}
