import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ToggleSchema = z.object({
  habitId: z.string(),
  date: z.string(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const logs = await prisma.habitLog.findMany({
    where: { userId: session.user.id, date: { gte: dayStart, lt: dayEnd } },
    select: { habitId: true, id: true },
  });

  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ToggleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { habitId, date: dateStr } = parsed.data;
  const date = new Date(dateStr);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const existing = await prisma.habitLog.findFirst({
    where: { habitId, userId: session.user.id, date: { gte: dayStart, lt: dayEnd } },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
    return NextResponse.json({ done: false });
  } else {
    await prisma.habitLog.create({
      data: { userId: session.user.id, habitId, date: dayStart },
    });
    return NextResponse.json({ done: true });
  }
}
