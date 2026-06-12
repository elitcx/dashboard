import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

// Returns the set of days (YYYY-MM-DD) the user worked out over the last N days,
// plus the planned weekdays from their split — enough to render a heatmap and a
// month calendar (done / missed / rest) entirely on the client.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "365", 10), 1), 730);

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [workouts, split] = await Promise.all([
      prisma.workout.findMany({
        where: { userId: user.id, date: { gte: since } },
        select: { date: true, dayType: true },
        orderBy: { date: "asc" },
      }),
      prisma.workoutSplitDay.findMany({
        where: { userId: user.id },
        select: { weekday: true, isRest: true, dayType: true, label: true },
      }),
    ]);

    // Collapse to one entry per calendar day (a day counts as "worked out" if
    // any workout exists). Keep the first dayType for coloring.
    const byDay = new Map<string, string>();
    for (const w of workouts) {
      const key = w.date.toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, w.dayType);
    }

    const workoutDays = Array.from(byDay.entries()).map(([date, dayType]) => ({
      date,
      dayType,
    }));

    // Which weekdays are training days vs rest, per the split.
    const plannedWeekdays = split
      .filter((d) => !d.isRest)
      .map((d) => d.weekday);

    return NextResponse.json({
      days,
      since: since.toISOString().slice(0, 10),
      workoutDays,
      plannedWeekdays,
      hasSplit: split.length > 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/gym/consistency:", err);
    return NextResponse.json({ error: "Failed to fetch consistency" }, { status: 500 });
  }
}
