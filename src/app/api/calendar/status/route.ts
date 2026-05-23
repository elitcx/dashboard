import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const account = await prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: { id: true, scope: true },
    });

    const hasCalendarScope = account?.scope?.includes("calendar") ?? false;
    const hasTasksScope = account?.scope?.includes("tasks") ?? false;

    return NextResponse.json({
      connected: Boolean(account && hasCalendarScope),
      tasksConnected: Boolean(account && hasTasksScope),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ connected: false });
  }
}
