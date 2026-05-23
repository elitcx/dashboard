import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

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
