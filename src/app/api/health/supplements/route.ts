import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().max(50).optional(),
  timeOfDay: z.enum(["MORNING", "EVENING", "NIGHT"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedules = await prisma.supplementSchedule.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: [{ timeOfDay: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ schedules });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const schedule = await prisma.supplementSchedule.create({
    data: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
