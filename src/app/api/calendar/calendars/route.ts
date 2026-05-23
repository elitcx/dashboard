import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import {
  EVENT_COLOR_PALETTE,
  getGoogleCalendarClient,
  normalizeCalendarListEntry,
} from "@/lib/google-calendar";

export async function GET() {
  try {
    const user = await requireUser();
    const calendar = await getGoogleCalendarClient(user.id);
    if (!calendar) {
      return NextResponse.json({ calendars: [], connected: false });
    }

    const res = await calendar.calendarList.list({
      maxResults: 250,
      showHidden: false,
    });

    const calendars = (res.data.items ?? [])
      .map(normalizeCalendarListEntry)
      .filter((c) => c.id)
      .sort((a, b) => {
        if (a.primary && !b.primary) return -1;
        if (!a.primary && b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      calendars,
      connected: true,
      eventColors: EVENT_COLOR_PALETTE,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: msg }, { status: 401 });
    console.error("GET /api/calendar/calendars:", err);
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
      { status: 500 },
    );
  }
}
