import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import {
  getGoogleCalendarClient,
  normalizeCalendarListEntry,
  normalizeEvent,
} from "@/lib/google-calendar";

const reminderSchema = z.object({
  method: z.enum(["popup", "email"]),
  minutes: z.number().int().min(0).max(40320),
});

const updateEventSchema = z.object({
  calendarId: z.string().min(1).default("primary"),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(8000).optional(),
  location: z.string().max(500).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  allDay: z.boolean().optional(),
  colorId: z.string().nullable().optional(),
  reminders: z.array(reminderSchema).max(5).optional(),
  useDefaultReminders: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const calendar = await getGoogleCalendarClient(user.id);
    if (!calendar) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 412 },
      );
    }

    const {
      calendarId,
      title,
      description,
      location,
      start,
      end,
      allDay,
      colorId,
      reminders,
      useDefaultReminders,
    } = parsed.data;

    const requestBody: Record<string, unknown> = {};
    if (title !== undefined) requestBody.summary = title;
    if (description !== undefined) requestBody.description = description;
    if (location !== undefined) requestBody.location = location;
    if (start !== undefined) {
      requestBody.start = allDay
        ? { date: start.slice(0, 10) }
        : { dateTime: new Date(start).toISOString() };
    }
    if (end !== undefined) {
      requestBody.end = allDay
        ? { date: end.slice(0, 10) }
        : { dateTime: new Date(end).toISOString() };
    }
    if (colorId !== undefined) {
      // null means "clear" → omit colorId, which falls back to calendar color
      requestBody.colorId = colorId ?? null;
    }
    if (useDefaultReminders) {
      requestBody.reminders = { useDefault: true };
    } else if (reminders) {
      requestBody.reminders = { useDefault: false, overrides: reminders };
    }

    const res = await calendar.events.patch({
      calendarId,
      eventId: params.id,
      requestBody,
    });

    const list = await calendar.calendarList.list({ maxResults: 250 });
    const meta = (list.data.items ?? [])
      .map(normalizeCalendarListEntry)
      .find((c) => c.id === calendarId);

    return NextResponse.json({
      event: normalizeEvent(res.data, {
        id: calendarId,
        name: meta?.name,
        color: meta?.backgroundColor,
        accessRole: meta?.accessRole,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("PATCH /api/calendar/events/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update event" },
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
    const calendarId = searchParams.get("calendarId") ?? "primary";

    const calendar = await getGoogleCalendarClient(user.id);
    if (!calendar) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 412 },
      );
    }

    await calendar.events.delete({
      calendarId,
      eventId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("DELETE /api/calendar/events/[id]:", err);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
