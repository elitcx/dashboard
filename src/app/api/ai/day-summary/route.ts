import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getGoogleCalendarClient,
  normalizeCalendarListEntry,
  normalizeEvent,
  type CalendarEvent,
} from "@/lib/google-calendar";

const TYPE = "schedule_day";

export type DaySummary = {
  headline: string;
  summary: string;
  priorities: { title: string; detail: string; level: "high" | "med" | "low" }[];
  prep: string[];
  tips: string[];
  eventCount: number;
};

function fmtTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function durationMin(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

function describeEvents(events: CalendarEvent[]): string {
  if (events.length === 0) return "No events scheduled.";
  return events
    .map((e, i) => {
      const time = e.allDay
        ? "All day"
        : `${fmtTime(e.start, false)}–${fmtTime(e.end, false)} (${durationMin(e.start, e.end)} min)`;
      const where = e.location ? ` @ ${e.location}` : e.meetingUrl ? " (video)" : "";
      const cal = e.calendarName ? ` [${e.calendarName}]` : "";
      const attendees = e.attendees && e.attendees.length > 1 ? ` — ${e.attendees.length} attendees` : "";
      const desc = e.description ? ` — notes: ${e.description.slice(0, 160).replace(/\s+/g, " ")}` : "";
      return `${i + 1}. ${time} — "${e.title}"${where}${cal}${attendees}${desc}`;
    })
    .join("\n");
}

function findGaps(events: CalendarEvent[]): string {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  if (timed.length < 2) return "n/a";
  const gaps: string[] = [];
  for (let i = 0; i < timed.length - 1; i++) {
    const endA = new Date(timed[i].end).getTime();
    const startB = new Date(timed[i + 1].start).getTime();
    const min = Math.round((startB - endA) / 60000);
    if (min >= 30) {
      gaps.push(`${fmtTime(timed[i].end, false)}–${fmtTime(timed[i + 1].start, false)} (${min} min)`);
    }
  }
  return gaps.length > 0 ? gaps.join(", ") : "no significant gaps";
}

function findConflicts(events: CalendarEvent[]): string {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const conflicts: string[] = [];
  for (let i = 0; i < timed.length - 1; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (new Date(timed[j].start).getTime() < new Date(timed[i].end).getTime()) {
        conflicts.push(`"${timed[i].title}" overlaps "${timed[j].title}"`);
      }
    }
  }
  return conflicts.length > 0 ? conflicts.join("; ") : "no conflicts";
}

async function fetchEventsForDay(
  userId: string,
  dateStr: string,
  calendarIdsParam: string | null,
): Promise<CalendarEvent[]> {
  const calendar = await getGoogleCalendarClient(userId);
  if (!calendar) return [];

  const [y, m, d] = dateStr.split("-").map(Number);
  // Use a wide UTC window covering the user's local day (UTC-12 to UTC+14 ~ 26h on either side is overkill;
  // we widen by 24h on each side, then the prompt itself filters by date later if needed).
  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const timeMin = new Date(dayStart.getTime() - 14 * 3600 * 1000).toISOString();
  const timeMax = new Date(dayStart.getTime() + 38 * 3600 * 1000).toISOString();

  let targetCalendars: { id: string; name?: string; color?: string; accessRole?: string }[];
  if (calendarIdsParam === "") {
    return [];
  }
  const list = await calendar.calendarList.list({ maxResults: 250 });
  const meta = new Map(
    (list.data.items ?? []).map((c) => [c.id ?? "", normalizeCalendarListEntry(c)]),
  );
  if (calendarIdsParam) {
    targetCalendars = calendarIdsParam
      .split(",")
      .filter(Boolean)
      .map((id) => {
        const m2 = meta.get(id);
        return {
          id,
          name: m2?.name,
          color: m2?.backgroundColor,
          accessRole: m2?.accessRole,
        };
      });
  } else {
    targetCalendars = Array.from(meta.values())
      .filter((c) => c.selected)
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.backgroundColor,
        accessRole: c.accessRole,
      }));
  }

  const allEvents = await Promise.all(
    targetCalendars.map(async (cal) => {
      try {
        const res = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
        });
        return (res.data.items ?? []).map((e) => normalizeEvent(e, cal));
      } catch (err) {
        console.warn(`day-summary: failed to list events for ${cal.id}:`, err);
        return [];
      }
    }),
  );

  // Filter to events that overlap the user's local day (dateStr).
  // We use the YYYY-MM-DD prefix of the event's start/end in user's local time
  // approximated by the date components of the ISO string converted to local.
  const events = allEvents.flat().filter((e) => {
    const s = new Date(e.start);
    const en = new Date(e.end);
    const dayStartLocal = new Date(y, m - 1, d, 0, 0, 0).getTime();
    const dayEndLocal = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    if (e.allDay) {
      // All-day events: GCal returns date-only strings; new Date parses them as UTC midnight.
      // An all-day event covers [start, end) date-only.
      return s.getTime() <= dayEndLocal && en.getTime() > dayStartLocal;
    }
    return s.getTime() <= dayEndLocal && en.getTime() >= dayStartLocal;
  });

  events.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  return events;
}

async function generateDaySummary(
  userId: string,
  dateStr: string,
  calendarIdsParam: string | null,
): Promise<DaySummary> {
  const events = await fetchEventsForDay(userId, dateStr, calendarIdsParam);

  const date = new Date(`${dateStr}T12:00:00`);
  const dayLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (events.length === 0) {
    return {
      headline: "Clear day — your time, your call",
      summary: `Nothing on your calendar for ${dayLabel}. A blank canvas is a gift: pick one or two outcomes you'd be proud of by tonight and start there.`,
      priorities: [
        {
          title: "Choose your top 3 outcomes",
          detail: "Without meetings, the day's structure is up to you — define it before noon.",
          level: "high",
        },
      ],
      prep: ["Decide your top 1–3 priorities before opening email or Slack."],
      tips: [
        "Front-load deep work before lunch — your willpower is highest then.",
        "Schedule one 20-minute break mid-afternoon to reset.",
      ],
      eventCount: 0,
    };
  }

  const timedCount = events.filter((e) => !e.allDay).length;
  const allDayCount = events.length - timedCount;
  const totalMinutes = events
    .filter((e) => !e.allDay)
    .reduce((acc, e) => acc + durationMin(e.start, e.end), 0);

  const firstTimed = events.find((e) => !e.allDay);
  const lastTimed = [...events].reverse().find((e) => !e.allDay);

  const prompt = `You are a thoughtful executive assistant briefing the user on their day. Be warm, specific, and practical — not generic. Refer to events by their actual names and times.

Date: ${dayLabel}
Events (${events.length} total — ${timedCount} timed, ${allDayCount} all-day, ${totalMinutes} minutes of meetings):
${describeEvents(events)}

Earliest meeting: ${firstTimed ? `${fmtTime(firstTimed.start, false)} ("${firstTimed.title}")` : "none"}
Latest meeting ends: ${lastTimed ? `${fmtTime(lastTimed.end, false)} ("${lastTimed.title}")` : "none"}
Free gaps ≥ 30 min between meetings: ${findGaps(events)}
Conflicts: ${findConflicts(events)}

Return ONLY a raw JSON object (no markdown, no code fences). Schema:
{
  "headline": "string — 5–8 words, captures the day's vibe (e.g. 'Heavy meeting day — protect lunch')",
  "summary": "string — 2-4 sentence narrative. Mention event count, total meeting time, when the day starts/ends, and the overall shape. Be specific.",
  "priorities": [
    { "title": "Event name (time)", "detail": "Why it matters or what to do for it, 1 sentence", "level": "high" | "med" | "low" }
  ],
  "prep": ["string — concrete prep item, reference specific event names"],
  "tips": ["string — actionable insight: gaps, time-blocking, energy, conflicts, when to eat, breaks"]
}

Rules:
- 1–4 priorities, ranked by importance. Use the actual event titles.
- 2–4 prep items. Tie each to a specific event when possible.
- 2–4 tips. Be opinionated — flag conflicts, suggest using gaps for deep work, warn if back-to-back meetings leave no lunch room, etc.
- If there are very few events, lean into the open time as opportunity.
- Use 12-hour time format (e.g. "2:00 PM"). Do not invent events not in the list.`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
  const result = await model.generateContent(prompt);
  const text = result.response
    .text()
    .trim()
    .replace(/^```json\n?/, "")
    .replace(/^```\n?/, "")
    .replace(/\n?```$/, "");
  const parsed = JSON.parse(text) as Omit<DaySummary, "eventCount">;
  return { ...parsed, eventCount: events.length };
}

function getDateParam(req: Request): string {
  const { searchParams } = new URL(req.url);
  return searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
}

function getCalIdsParam(req: Request): string | null {
  const { searchParams } = new URL(req.url);
  return searchParams.get("calendarIds");
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateStr = getDateParam(req);

  const existing = await prisma.aIInsight.findUnique({
    where: { userId_type_cacheKey: { userId: session.user.id, type: TYPE, cacheKey: dateStr } },
  });

  if (existing) {
    return NextResponse.json({
      summary: JSON.parse(existing.content) as DaySummary,
      generatedAt: existing.generatedAt,
      cached: true,
    });
  }

  return NextResponse.json({ summary: null, cached: false });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateStr = getDateParam(req);
  const calIds = getCalIdsParam(req);

  await prisma.aIInsight.deleteMany({
    where: { userId: session.user.id, type: TYPE, cacheKey: dateStr },
  });

  try {
    const summary = await generateDaySummary(session.user.id, dateStr, calIds);
    const record = await prisma.aIInsight.create({
      data: {
        userId: session.user.id,
        type: TYPE,
        cacheKey: dateStr,
        content: JSON.stringify(summary),
      },
    });
    return NextResponse.json({ summary, generatedAt: record.generatedAt, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Day summary generation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
