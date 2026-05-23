import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export type ProgressMetricType = "e1rm" | "reps" | "duration";

export type ProgressPoint = {
  date: string;
  metric: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
};

export type ProgressResponse = {
  metricType: ProgressMetricType;
  series: ProgressPoint[];
};

// Epley estimated 1-rep-max: weight × (1 + reps/30)
function epley(weight: number, reps: number): number {
  return reps > 1 ? weight * (1 + reps / 30) : weight;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const exerciseId = searchParams.get("exerciseId");
    if (!exerciseId) {
      return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
    }

    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId,
        workout: { userId: user.id },
        OR: [
          { weight: { not: null } },
          { reps: { not: null } },
          { duration: { not: null } },
        ],
      },
      select: {
        weight: true,
        reps: true,
        duration: true,
        workout: { select: { date: true } },
      },
      orderBy: { workout: { date: "asc" } },
    });

    if (sets.length === 0) {
      return NextResponse.json({ metricType: "reps", series: [] } satisfies ProgressResponse);
    }

    // Determine the dominant metric type for this exercise:
    //   weighted  → use Epley e1RM  (handles both standard and bodyweight+belt days)
    //   reps-only → use max reps    (BW exercises like pull-ups)
    //   duration  → use duration    (cardio like incline walk)
    const hasWeighted = sets.some((s) => s.weight != null && s.weight > 0);
    const hasReps = sets.some((s) => s.reps != null && s.reps > 0);
    const hasDuration = sets.some((s) => s.duration != null && s.duration > 0);

    const metricType: ProgressMetricType = hasWeighted ? "e1rm" : hasReps ? "reps" : "duration";

    // Group by workout date → keep the best metric value for that session
    const grouped = new Map<string, ProgressPoint>();

    for (const s of sets) {
      const dateKey = s.workout.date.toISOString().slice(0, 10);

      let metric: number;
      if (metricType === "e1rm") {
        if (s.weight == null || s.weight <= 0) continue;
        metric = Math.round(epley(s.weight, s.reps ?? 1) * 10) / 10;
      } else if (metricType === "reps") {
        if (s.reps == null || s.reps <= 0) continue;
        metric = s.reps;
      } else {
        if (s.duration == null || s.duration <= 0) continue;
        metric = s.duration;
      }

      const existing = grouped.get(dateKey);
      if (!existing || metric > existing.metric) {
        grouped.set(dateKey, {
          date: dateKey,
          metric,
          weight: s.weight,
          reps: s.reps,
          duration: s.duration,
        });
      }
    }

    const series = Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ metricType, series } satisfies ProgressResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/gym/progress:", err);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
