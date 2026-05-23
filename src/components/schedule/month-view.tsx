"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getMonthGrid,
  getEventsForDay,
  hexToRgba,
  isSameDay,
} from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/lib/google-calendar";

type Props = {
  date: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ date, events, onDayClick, onEventClick }: Props) {
  const grid = getMonthGrid(date);
  const today = new Date();
  const currentMonth = date.getMonth();

  return (
    <motion.div
      key={`month-${date.toISOString()}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass overflow-hidden rounded-3xl"
    >
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-white/5">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-3.5 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const inMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, today);
          const dayEvents = getEventsForDay(events, day);
          const visibleEvents = dayEvents.slice(0, 4);
          const overflow = dayEvents.length - visibleEvents.length;

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "group relative min-h-[148px] border-b border-r border-white/[0.06] p-3 text-left transition-colors hover:bg-white/[0.025]",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "opacity-50",
              )}
            >
              {/* Day number */}
              <div className="mb-2 flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-all",
                    isToday
                      ? "bg-emerald-500 text-black shadow-[0_0_16px_rgba(16,185,129,0.45)]"
                      : inMonth
                        ? "text-white/80 group-hover:bg-white/[0.06]"
                        : "text-white/30",
                  )}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="space-y-1">
                {visibleEvents.map((event) =>
                  event.allDay ? (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onEventClick(event); } }}
                      className="truncate rounded-md py-[3px] pl-2.5 pr-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110"
                      style={{
                        backgroundColor: hexToRgba(event.background, 0.22),
                        borderLeft: `2.5px solid ${event.background}`,
                      }}
                    >
                      {event.title}
                    </div>
                  ) : (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onEventClick(event); } }}
                      className="flex items-center gap-2 truncate rounded-md px-1.5 py-[3px] transition-colors hover:bg-white/[0.04]"
                    >
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: event.background }}
                      />
                      <span className="truncate text-[11px] font-medium text-white/85">
                        {event.title}
                      </span>
                    </div>
                  ),
                )}
                {overflow > 0 && (
                  <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70">
                    +{overflow} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
