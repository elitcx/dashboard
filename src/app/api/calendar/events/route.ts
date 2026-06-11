import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-utils";
import {
  getGoogleCalendarClient,
  normalizeCalendarListEntry,
  normalizeEvent,
} from "@/lib/google-calendar";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const calendarIdsParam = searchParams.get("calendarIds");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to are required" },
        { status: 400 },
      );
    }

    const calendar = await getGoogleCalendarClient(user.id);
    if (!calendar) {
      return NextResponse.json({ events: [], connected: false });
    }

    // Resolve which calendars to read. If the client explicitly passed an empty
    // string we treat that as "none selected" — return immediately with no events.
    let targetCalendars: { id: string; name?: string; color?: string; accessRole?: string }[];
    if (calendarIdsParam === "") {
      return NextResponse.json({ events: [], connected: true });
    } else if (calendarIdsParam) {
      const list = await calendar.calendarList.list({ maxResults: 250 });
      const meta = new Map(
        (list.data.items ?? []).map((c) => [
          c.id ?? "",
          normalizeCalendarListEntry(c),
        ]),
      );
      targetCalendars = calendarIdsParam
        .split(",")
        .filter(Boolean)
        .map((id) => {
          const m = meta.get(id);
          return {
            id,
            name: m?.name,
            color: m?.backgroundColor,
            accessRole: m?.accessRole,
          };
        });
    } else {
      // Default: all calendars that the user has marked "selected" in Google.
      const list = await calendar.calendarList.list({ maxResults: 250 });
      targetCalendars = (list.data.items ?? [])
        .map(normalizeCalendarListEntry)
        .filter((c) => c.selected)
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.backgroundColor,
          accessRole: c.accessRole,
        }));
    }

    const timeMin = new Date(from).toISOString();
    const timeMax = new Date(to).toISOString();

    const allEvents = await Promise.all(
      targetCalendars.map(async (cal) => {
        try {
          const res = await calendar.events.list({
            calendarId: cal.id,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 500,
          });
          return (res.data.items ?? []).map((e) => normalizeEvent(e, cal));
        } catch (err) {
          console.warn(`Failed to list events for calendar ${cal.id}:`, err);
          return [];
        }
      }),
    );

    const events = allEvents.flat();
    return NextResponse.json({ events, connected: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/calendar/events:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

const reminderSchema = z.object({
  method: z.enum(["popup", "email"]),
  minutes: z.number().int().min(0).max(40320), // up to 4 weeks
});

const createEventSchema = z.object({
  calendarId: z.string().min(1).default("primary"),
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  location: z.string().max(500).optional(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean().default(false),
  timeZone: z.string().max(100).optional(),
  colorId: z.string().optional(),
  reminders: z.array(reminderSchema).max(5).optional(),
  useDefaultReminders: z.boolean().optional(),
  addMeet: z.boolean().optional(),
  recurrence: z.array(z.string()).max(5).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
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
      timeZone,
      colorId,
      reminders,
      useDefaultReminders,
      addMeet,
      recurrence,
    } = parsed.data;

    // Google requires an explicit IANA time zone on timed recurring events;
    // include it on all timed events so recurrence expansion is unambiguous.
    const requestBody: Record<string, unknown> = {
      summary: title,
      description,
      location,
      start: allDay
        ? { date: start.slice(0, 10) }
        : { dateTime: new Date(start).toISOString(), ...(timeZone && { timeZone }) },
      end: allDay
        ? { date: end.slice(0, 10) }
        : { dateTime: new Date(end).toISOString(), ...(timeZone && { timeZone }) },
    };

    if (colorId) requestBody.colorId = colorId;
    if (recurrence && recurrence.length > 0) requestBody.recurrence = recurrence;

    if (useDefaultReminders) {
      requestBody.reminders = { useDefault: true };
    } else if (reminders) {
      requestBody.reminders = { useDefault: false, overrides: reminders };
    }

    if (addMeet) {
      requestBody.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const res = await calendar.events.insert({
      calendarId,
      requestBody,
      conferenceDataVersion: addMeet ? 1 : 0,
    });

    // Look up calendar meta for the response so colors come back right.
    const list = await calendar.calendarList.list({ maxResults: 250 });
    const meta = (list.data.items ?? [])
      .map(normalizeCalendarListEntry)
      .find((c) => c.id === calendarId);

    return NextResponse.json(
      {
        event: normalizeEvent(res.data, {
          id: calendarId,
          name: meta?.name,
          color: meta?.backgroundColor,
          accessRole: meta?.accessRole,
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("POST /api/calendar/events:", err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
