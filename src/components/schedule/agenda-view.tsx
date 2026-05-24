"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatTime,
  hexToRgba,
  isSameDay,
  startOfDay,
} from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/lib/google-calendar";

type Props = {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
};

type DayGroup = { key: string; date: Date; events: CalendarEvent[] };

function groupByDay(events: CalendarEvent[], from: Date): DayGroup[] {
  const fromTs = startOfDay(from).getTime();
  const map = new Map<string, DayGroup>();

  for (const ev of events) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const cursor = startOfDay(start);
    const last = ev.allDay
      ? startOfDay(new Date(end.getTime() - 1))
      : startOfDay(end);

    // Multi-day events: emit one entry per day they cover (within range).
    while (cursor.getTime() <= last.getTime()) {
      if (cursor.getTime() >= fromTs) {
        const key = cursor.toISOString().slice(0, 10);
        let group = map.get(key);
        if (!group) {
          group = { key, date: new Date(cursor), events: [] };
          map.set(key, group);
        }
        group.events.push(ev);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  for (const g of map.values()) {
    g.events.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function dayHeader(d: Date): { weekday: string; rest: string; isToday: boolean } {
  const today = new Date();
  const isToday = isSameDay(d, today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isToday) {
    return {
      weekday: "Today",
      rest: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isToday: true,
    };
  }
  if (isSameDay(d, tomorrow)) {
    return {
      weekday: "Tomorrow",
      rest: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isToday: false,
    };
  }
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    rest: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isToday: false,
  };
}

export function AgendaView({ date, events, onEventClick }: Props) {
  const groups = useMemo(() => groupByDay(events, date), [events, date]);

  return (
    <motion.div
      key={`agenda-${date.toISOString()}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass overflow-hidden rounded-3xl"
    >
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
            <CalendarDays className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Nothing on the horizon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No upcoming events in this range.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {groups.map((g) => {
            const h = dayHeader(g.date);
            return (
              <li key={g.key} className="px-4 py-3 sm:px-6 sm:py-4">
                <div className="mb-2.5 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      h.isToday ? "text-emerald-300" : "text-white",
                    )}
                  >
                    {h.weekday}
                  </span>
                  <span className="text-xs text-muted-foreground/70">{h.rest}</span>
                  <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {g.events.length} {g.events.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {g.events.map((event) => (
                    <li key={`${g.key}-${event.id}`}>
                      <button
                        onClick={() => onEventClick(event)}
                        className="flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]"
                      >
                        <span
                          className="mt-1 h-3 w-1 shrink-0 rounded-full"
                          style={{
                            backgroundColor: event.background,
                            boxShadow: `0 0 12px ${hexToRgba(event.background, 0.5)}`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">
                            {event.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>
                              {event.allDay
                                ? "All day"
                                : `${formatTime(event.start)} – ${formatTime(event.end)}`}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1 truncate">
                                <span className="text-muted-foreground/40">·</span>
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </span>
                            )}
                            {!event.location && event.meetingUrl && (
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground/40">·</span>
                                <Video className="h-3 w-3" />
                                <span>Meet</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
