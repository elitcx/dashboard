import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { getGoogleTasksClient, normalizeTaskList } from "@/lib/google-calendar";

export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await getGoogleTasksClient(user.id);
    if (!tasks) {
      return NextResponse.json({ lists: [], connected: false });
    }

    const res = await tasks.tasklists.list({ maxResults: 100 });
    const lists = (res.data.items ?? []).map(normalizeTaskList).filter((l) => l.id);

    return NextResponse.json({ lists, connected: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/tasks/lists:", err);
    return NextResponse.json(
      { error: "Failed to fetch task lists" },
      { status: 500 },
    );
  }
}
