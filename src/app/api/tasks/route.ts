import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import { getGoogleTasksClient, normalizeTask } from "@/lib/google-calendar";

// GET /api/tasks?listIds=a,b   → fetches tasks across selected lists.
// If no listIds passed → all lists.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const tasks = await getGoogleTasksClient(user.id);
    if (!tasks) {
      return NextResponse.json({ tasks: [], connected: false });
    }

    const { searchParams } = new URL(req.url);
    const listIdsParam = searchParams.get("listIds");

    let listIds: string[];
    if (listIdsParam === "") {
      return NextResponse.json({ tasks: [], connected: true });
    } else if (listIdsParam) {
      listIds = listIdsParam.split(",").filter(Boolean);
    } else {
      const lists = await tasks.tasklists.list({ maxResults: 100 });
      listIds = (lists.data.items ?? [])
        .map((l) => l.id ?? "")
        .filter(Boolean);
    }

    const all = await Promise.all(
      listIds.map(async (listId) => {
        try {
          const res = await tasks.tasks.list({
            tasklist: listId,
            maxResults: 100,
            showCompleted: true,
            showHidden: false,
          });
          return (res.data.items ?? []).map((t) => normalizeTask(t, listId));
        } catch (err) {
          console.warn(`Failed to list tasks for ${listId}:`, err);
          return [];
        }
      }),
    );

    return NextResponse.json({ tasks: all.flat(), connected: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/tasks:", err);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1).max(1024),
  notes: z.string().max(8192).optional(),
  due: z.string().optional(), // RFC3339; date portion is used by Google
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const tasks = await getGoogleTasksClient(user.id);
    if (!tasks) {
      return NextResponse.json(
        { error: "Google Tasks not connected" },
        { status: 412 },
      );
    }

    const { listId, title, notes, due } = parsed.data;

    const res = await tasks.tasks.insert({
      tasklist: listId,
      requestBody: {
        title,
        notes,
        due: due ? new Date(due).toISOString() : undefined,
      },
    });

    return NextResponse.json(
      { task: normalizeTask(res.data, listId) },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("POST /api/tasks:", err);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
