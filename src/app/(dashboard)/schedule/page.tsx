"use client";

import { motion } from "framer-motion";
import { CalendarView } from "@/components/schedule/calendar-view";
import { TodoPanel } from "@/components/schedule/todo-panel";
import { ConnectGoogle } from "@/components/schedule/connect-google";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCalendarList,
  useCalendarStatus,
  useSelectedCalendarIds,
} from "@/hooks/use-calendar";

export default function SchedulePage() {
  const { data: status, isLoading } = useCalendarStatus();
  const connected = status?.connected ?? false;
  const { data: calData } = useCalendarList();
  const allIds = (calData?.calendars ?? []).map((c) => c.id);
  const { selected, toggle, setMany } = useSelectedCalendarIds(allIds);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">
            Schedule
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Your Google Calendar, reskinned. Color-coded, multi-calendar, two-way sync.
          </p>
        </div>
        {connected && <ConnectGoogle inline />}
      </motion.div>

      {isLoading ? (
        <div className="glass rounded-3xl p-6 space-y-4">
          {/* Tab bar skeleton */}
          <div className="flex items-center gap-2">
            {[80, 56, 56].map((w, i) => (
              <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
            ))}
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-8 mx-auto rounded" />
                <Skeleton className="h-8 w-8 mx-auto rounded-full" />
              </div>
            ))}
          </div>
          {/* Event rows */}
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 flex-1 max-w-[50%]" />
              </div>
            ))}
          </div>
        </div>
      ) : !connected ? (
        <div className="glass rounded-3xl">
          <ConnectGoogle />
        </div>
      ) : (
        <div className="space-y-5">
          <CalendarView
            selectedCalendarIds={selected}
            calendars={calData?.calendars ?? []}
            onToggleCalendar={toggle}
            onSetManyCalendars={setMany}
          />
          <TodoPanel />
        </div>
      )}
    </>
  );
}
