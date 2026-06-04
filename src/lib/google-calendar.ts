import { google, type calendar_v3, type tasks_v1 } from "googleapis";
import { prisma } from "./prisma";

function oauthClientFromAccount(account: {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : account.expires_at,
        },
      });
    }
  });

  return oauth2Client;
}

async function getAccount(userId: string) {
  return prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
}

export async function getGoogleCalendarClient(
  userId: string,
): Promise<calendar_v3.Calendar | null> {
  const account = await getAccount(userId);
  if (!account?.access_token) return null;
  return google.calendar({ version: "v3", auth: oauthClientFromAccount(account) });
}

export async function getGoogleTasksClient(
  userId: string,
): Promise<tasks_v1.Tasks | null> {
  const account = await getAccount(userId);
  if (!account?.access_token) return null;
  if (!account.scope?.includes("tasks")) return null;
  return google.tasks({ version: "v1", auth: oauthClientFromAccount(account) });
}

// ─── Color palette (Google Calendar's standard) ──────────────────────
// These mirror google's eventColors / calendarColors. We embed them so
// we don't need to fetch /colors every page load.

export const EVENT_COLOR_PALETTE: Record<
  string,
  { name: string; background: string; foreground: string }
> = {
  "1": { name: "Lavender", background: "#7986CB", foreground: "#FFFFFF" },
  "2": { name: "Sage", background: "#33B679", foreground: "#FFFFFF" },
  "3": { name: "Grape", background: "#8E24AA", foreground: "#FFFFFF" },
  "4": { name: "Flamingo", background: "#E67C73", foreground: "#FFFFFF" },
  "5": { name: "Banana", background: "#F6BF26", foreground: "#1F2937" },
  "6": { name: "Tangerine", background: "#F4511E", foreground: "#FFFFFF" },
  "7": { name: "Peacock", background: "#039BE5", foreground: "#FFFFFF" },
  "8": { name: "Graphite", background: "#616161", foreground: "#FFFFFF" },
  "9": { name: "Blueberry", background: "#3F51B5", foreground: "#FFFFFF" },
  "10": { name: "Basil", background: "#0B8043", foreground: "#FFFFFF" },
  "11": { name: "Tomato", background: "#D50000", foreground: "#FFFFFF" },
};

export const DEFAULT_EVENT_COLOR = { background: "#10B981", foreground: "#FFFFFF" };

export function getEventColor(
  eventColorId?: string | null,
  calendarColor?: string | null,
): { background: string; foreground: string } {
  if (eventColorId && EVENT_COLOR_PALETTE[eventColorId]) {
    return {
      background: EVENT_COLOR_PALETTE[eventColorId].background,
      foreground: EVENT_COLOR_PALETTE[eventColorId].foreground,
    };
  }
  if (calendarColor) {
    return { background: calendarColor, foreground: "#FFFFFF" };
  }
  return DEFAULT_EVENT_COLOR;
}

// ─── Event reminder type ─────────────────────────────────────────────

export type EventReminder = {
  method: "popup" | "email";
  minutes: number;
};

// ─── Calendar list ───────────────────────────────────────────────────

export type CalendarListEntry = {
  id: string;
  name: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary: boolean;
  selected: boolean;
  accessRole: string;
};

export function normalizeCalendarListEntry(
  c: calendar_v3.Schema$CalendarListEntry,
): CalendarListEntry {
  return {
    id: c.id ?? "",
    name: c.summaryOverride ?? c.summary ?? "(Untitled)",
    description: c.description ?? undefined,
    backgroundColor: c.backgroundColor ?? "#10B981",
    foregroundColor: c.foregroundColor ?? "#FFFFFF",
    primary: Boolean(c.primary),
    selected: c.selected !== false,
    accessRole: c.accessRole ?? "reader",
  };
}

// ─── Event ───────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string;
  calendarId: string;
  calendarName?: string;
  calendarColor?: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  status: string;
  colorId?: string;
  background: string;
  foreground: string;
  hangoutLink?: string;
  htmlLink?: string;
  meetingUrl?: string;
  reminders: EventReminder[];
  remindersUseDefault: boolean;
  recurringEventId?: string;
  recurrence?: string[];
  readOnly: boolean;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
};

export function normalizeEvent(
  ev: calendar_v3.Schema$Event,
  cal?: { id: string; name?: string; color?: string; accessRole?: string },
): CalendarEvent {
  const start = ev.start?.dateTime ?? ev.start?.date ?? "";
  const end = ev.end?.dateTime ?? ev.end?.date ?? "";
  const colorId = ev.colorId ?? undefined;
  const colors = getEventColor(colorId, cal?.color);

  // Reminders: either inherited from calendar default, or explicit overrides.
  let reminders: EventReminder[] = [];
  let remindersUseDefault = false;
  if (ev.reminders) {
    if (ev.reminders.useDefault) {
      remindersUseDefault = true;
    } else if (ev.reminders.overrides) {
      reminders = ev.reminders.overrides
        .filter((r) => r.method && typeof r.minutes === "number")
        .map((r) => ({
          method: (r.method === "email" ? "email" : "popup") as
            | "popup"
            | "email",
          minutes: r.minutes ?? 0,
        }));
    }
  } else {
    remindersUseDefault = true;
  }

  const meetingUrl =
    ev.hangoutLink ??
    ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")
      ?.uri ??
    undefined;

  return {
    id: ev.id ?? "",
    calendarId: cal?.id ?? "primary",
    calendarName: cal?.name,
    calendarColor: cal?.color,
    title: ev.summary ?? "(Untitled)",
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    start,
    end,
    allDay: Boolean(ev.start?.date && !ev.start?.dateTime),
    status: ev.status ?? "confirmed",
    colorId,
    background: colors.background,
    foreground: colors.foreground,
    hangoutLink: ev.hangoutLink ?? undefined,
    htmlLink: ev.htmlLink ?? undefined,
    meetingUrl,
    reminders,
    remindersUseDefault,
    recurringEventId: ev.recurringEventId ?? undefined,
    recurrence: ev.recurrence ?? undefined,
    readOnly: cal?.accessRole === "reader" || cal?.accessRole === "freeBusyReader",
    attendees:
      ev.attendees?.map((a) => ({
        email: a.email ?? "",
        displayName: a.displayName ?? undefined,
        responseStatus: a.responseStatus ?? undefined,
      })) ?? undefined,
  };
}

// ─── Task ────────────────────────────────────────────────────────────

export type GoogleTaskList = {
  id: string;
  title: string;
};

export type GoogleTask = {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  completed?: string;
  position: string;
};

export function normalizeTaskList(t: tasks_v1.Schema$TaskList): GoogleTaskList {
  return { id: t.id ?? "", title: t.title ?? "Tasks" };
}

export function normalizeTask(
  t: tasks_v1.Schema$Task,
  listId: string,
): GoogleTask {
  return {
    id: t.id ?? "",
    listId,
    title: t.title ?? "(Untitled)",
    notes: t.notes ?? undefined,
    due: t.due ?? undefined,
    status: t.status === "completed" ? "completed" : "needsAction",
    completed: t.completed ?? undefined,
    position: t.position ?? "",
  };
}
