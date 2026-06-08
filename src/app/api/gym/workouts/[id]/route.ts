import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

const setSchema = z.object({
  exerciseName: z.string().min(1).max(80),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().optional().nullable(),
  weight: z.number().nonnegative().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  distance: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(200).optional().nullable(),
});

const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(80),
  date: z.string(),
  dayType: z.enum(["PUSH", "PULL", "UPPER", "LOWER", "FULL_BODY", "CARDIO", "OTHER"]).default("OTHER"),
  duration: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  sets: z.array(setSchema).min(1).max(200),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        workoutSets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });
    if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ workout });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch workout" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = updateWorkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, date, dayType, duration, notes, sets } = parsed.data;

    const existing = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const uniqueNames = Array.from(new Set(sets.map((s) => s.exerciseName.trim())));
    const exerciseMap = new Map<string, string>();
    for (const exName of uniqueNames) {
      const ex = await prisma.exercise.upsert({
        where: { userId_name: { userId: user.id, name: exName } },
        update: {},
        create: { userId: user.id, name: exName, isCustom: true },
      });
      exerciseMap.set(exName, ex.id);
    }

    const workout = await prisma.$transaction(async (tx) => {
      await tx.workoutSet.deleteMany({ where: { workoutId: params.id } });
      return tx.workout.update({
        where: { id: params.id },
        data: {
          name,
          date: new Date(date),
          dayType,
          duration: duration ?? null,
          notes: notes ?? null,
          workoutSets: {
            create: sets.map((s) => ({
              exerciseId: exerciseMap.get(s.exerciseName.trim())!,
              setNumber: s.setNumber,
              reps: s.reps ?? null,
              weight: s.weight ?? null,
              duration: s.duration ?? null,
              distance: s.distance ?? null,
              notes: s.notes ?? null,
            })),
          },
        },
        include: {
          workoutSets: { include: { exercise: true } },
        },
      });
    });

    // Clean up exercises that no longer have any sets (e.g. after a rename)
    await prisma.exercise.deleteMany({
      where: { userId: user.id, workoutSets: { none: {} } },
    });

    return NextResponse.json({ workout });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("PUT /api/gym/workouts/[id]:", err);
    return NextResponse.json({ error: "Failed to update workout" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const result = await prisma.workout.deleteMany({
      where: { id: params.id, userId: user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete workout" }, { status: 500 });
  }
}
