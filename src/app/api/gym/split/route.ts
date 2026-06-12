import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const days = await prisma.workoutSplitDay.findMany({
      where: { userId: user.id },
      orderBy: { weekday: "asc" },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ days });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/gym/split:", err);
    return NextResponse.json({ error: "Failed to fetch split" }, { status: 500 });
  }
}

const splitExerciseSchema = z.object({
  name: z.string().min(1).max(80),
  targetSets: z.number().int().positive().max(50).optional().nullable(),
  targetReps: z.string().max(30).optional().nullable(),
});

const splitDaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  label: z.string().max(60).optional().default(""),
  dayType: z
    .enum(["PUSH", "PULL", "UPPER", "LOWER", "FULL_BODY", "CARDIO", "OTHER"])
    .default("OTHER"),
  isRest: z.boolean().default(false),
  exercises: z.array(splitExerciseSchema).max(40).default([]),
});

// Replace the whole split (7 days) in one transaction.
const updateSplitSchema = z.object({
  days: z.array(splitDaySchema).max(7),
});

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = updateSplitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { days } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.workoutSplitDay.deleteMany({ where: { userId: user.id } });
      for (const day of days) {
        await tx.workoutSplitDay.create({
          data: {
            userId: user.id,
            weekday: day.weekday,
            label: day.label ?? "",
            dayType: day.dayType,
            isRest: day.isRest,
            exercises: {
              create: day.exercises.map((ex, i) => ({
                name: ex.name.trim(),
                targetSets: ex.targetSets ?? null,
                targetReps: ex.targetReps?.trim() || null,
                order: i,
              })),
            },
          },
        });
      }
    });

    const updated = await prisma.workoutSplitDay.findMany({
      where: { userId: user.id },
      orderBy: { weekday: "asc" },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ days: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("PUT /api/gym/split:", err);
    return NextResponse.json({ error: "Failed to save split" }, { status: 500 });
  }
}
