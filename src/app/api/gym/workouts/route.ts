import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

    const workouts = await prisma.workout.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: limit,
      include: {
        workoutSets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });
    return NextResponse.json({ workouts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/gym/workouts:", err);
    return NextResponse.json({ error: "Failed to fetch workouts" }, { status: 500 });
  }
}

const setSchema = z.object({
  exerciseName: z.string().min(1).max(80),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().optional().nullable(),
  weight: z.number().nonnegative().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  distance: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(200).optional().nullable(),
});

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(80),
  date: z.string(),
  dayType: z
    .enum(["PUSH", "PULL", "UPPER", "LOWER", "FULL_BODY", "CARDIO", "OTHER"])
    .default("OTHER"),
  duration: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  sets: z.array(setSchema).min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createWorkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, date, dayType, duration, notes, sets } = parsed.data;

    // Resolve / create exercises by name (de-duplicated)
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

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
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

    return NextResponse.json({ workout }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("POST /api/gym/workouts:", err);
    return NextResponse.json({ error: "Failed to create workout" }, { status: 500 });
  }
}
