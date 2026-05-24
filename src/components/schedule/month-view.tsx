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
  selectedDay?: Date | null;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ date, events, selectedDay, onDayClick, onEventClick }: Props) {
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
            className="py-2.5 text-center text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 sm:py-3.5 sm:text-[11px]"
          >
            <span className="sm:hidden">{label[0]}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const inMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const dayEvents = getEventsForDay(events, day);
          const visibleEvents = dayEvents.slice(0, 4);
          const overflow = dayEvents.length - visibleEvents.length;
          const dotEvents = dayEvents.slice(0, 4);

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "group relative min-h-[64px] border-b border-r border-white/[0.06] p-1 text-left transition-colors hover:bg-white/[0.025] sm:min-h-[148px] sm:p-3",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "opacity-50",
                isSelected && !isToday && "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/30",
              )}
            >
              {/* Day number */}
              <div className="mb-1 flex items-center justify-center sm:mb-2 sm:justify-between">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all sm:h-7 sm:w-7 sm:text-sm",
                    isToday
                      ? "bg-emerald-500 text-black shadow-[0_0_16px_rgba(16,185,129,0.45)]"
                      : isSelected
                        ? "bg-white/10 text-white ring-1 ring-emerald-500/40"
                        : inMonth
                          ? "text-white/80 group-hover:bg-white/[0.06]"
                          : "text-white/30",
                  )}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Mobile: just dots */}
              {dotEvents.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 sm:hidden">
                  {dotEvents.map((event) => (
                    <span
                      key={event.id}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: event.background }}
                    />
                  ))}
                </div>
              )}

              {/* Desktop: full event list */}
              <div className="hidden space-y-1 sm:block">
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
