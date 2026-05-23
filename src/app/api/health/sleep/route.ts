import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/health/sleep?limit=7
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "7"), 30);

  const logs = await prisma.sleepLog.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}

const LogSchema = z.object({
  date: z.string(),
  hoursSlept: z.number().min(0).max(24),
  quality: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = LogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { date: dateStr, ...rest } = parsed.data;
  const date = new Date(dateStr);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const log = await prisma.sleepLog.upsert({
    where: { userId_date: { userId: session.user.id, date: dayStart } },
    update: rest,
    create: { userId: session.user.id, date: dayStart, ...rest },
  });

  return NextResponse.json({ log });
}
