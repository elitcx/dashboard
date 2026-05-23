"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar } from "lucide-react";
import { useMemo } from "react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarEvents, useCalendarStatus } from "@/hooks/use-calendar";
import { startOfDay, endOfDay, formatTime } from "@/lib/calendar-utils";

export function ScheduleWidget({ delay = 0 }: { delay?: number }) {
  const { data: status } = useCalendarStatus();
  const connected = status?.connected ?? false;

  const { from, to } = useMemo(() => {
    const now = new Date();
    return { from: startOfDay(now), to: endOfDay(now) };
  }, []);

  const { data, isLoading } = useCalendarEvents(from, to);
  const todayEvents = (data?.events ?? [])
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const upcoming = todayEvents.filter((e) => new Date(e.end) >= new Date());

  return (
    <GlassCard delay={delay} className="flex h-full flex-col">
      <Link href="/schedule" className="group flex items-start justify-between">
        <div>
          <CardLabel>Today's Schedule</CardLabel>
          <div className="mt-2 flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
            {isLoading ? (
              <Skeleton className="h-8 w-10 rounded" />
            ) : (
              <>
                <span className="text-3xl font-medium text-white">{todayEvents.length}</span>
                <span className="text-sm text-muted-foreground">events</span>
              </>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </Link>

      <div className="mt-6 flex-1 space-y-2.5">
        {!connected ? (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">
            Connect Google Calendar
            <br />
            to see today's events
          </div>
        ) : isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 flex-1 max-w-[55%]" />
              </div>
            ))}
          </>
        ) : todayEvents.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-muted-foreground">
            Nothing scheduled today
          </div>
        ) : (
          (upcoming.length > 0 ? upcoming : todayEvents).slice(0, 4).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-emerald-500/20 hover:bg-white/[0.04]"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: event.background }}
              />
              <div className="font-mono text-sm font-medium text-emerald-400">
                {formatTime(event.start)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{event.title}</div>
                {event.location && (
                  <div className="truncate text-xs text-muted-foreground">{event.location}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
