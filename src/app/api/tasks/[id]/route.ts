import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import { getGoogleTasksClient, normalizeTask } from "@/lib/google-calendar";

const patchSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1).max(1024).optional(),
  notes: z.string().max(8192).optional(),
  due: z.string().nullable().optional(),
  status: z.enum(["needsAction", "completed"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
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

    const { listId, title, notes, due, status } = parsed.data;
    const requestBody: Record<string, unknown> = {};
    if (title !== undefined) requestBody.title = title;
    if (notes !== undefined) requestBody.notes = notes;
    if (due !== undefined) {
      requestBody.due = due ? new Date(due).toISOString() : null;
    }
    if (status !== undefined) {
      requestBody.status = status;
      if (status === "needsAction") requestBody.completed = null;
    }

    const res = await tasks.tasks.patch({
      tasklist: listId,
      task: params.id,
      requestBody,
    });

    return NextResponse.json({ task: normalizeTask(res.data, listId) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("PATCH /api/tasks/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    if (!listId) {
      return NextResponse.json(
        { error: "listId is required" },
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

    await tasks.tasks.delete({ tasklist: listId, task: params.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("DELETE /api/tasks/[id]:", err);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
