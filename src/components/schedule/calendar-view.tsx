"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ViewMode,
  addDays,
  getEventsForDay,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  formatTime,
  hexToRgba,
} from "@/lib/calendar-utils";
import { useCalendarEvents, useCreateEvent, useUpdateEvent } from "@/hooks/use-calendar";
import type { CalendarEvent, CalendarListEntry } from "@/lib/google-calendar";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { AgendaView } from "./agenda-view";
import { EventForm } from "./event-form";

const AGENDA_DAYS_AHEAD = 30;

type Props = {
  selectedCalendarIds: string[] | null;
  calendars: CalendarListEntry[];
  onToggleCalendar: (id: string) => void;
  onSetManyCalendars: (ids: string[]) => void;
};

export function CalendarView({
  selectedCalendarIds,
  calendars,
  onToggleCalendar,
  onSetManyCalendars,
}: Props) {
  const updateEvent = useUpdateEvent();
  const createEvent = useCreateEvent();

  async function handleEventDrop(event: CalendarEvent, newStart: Date, newEnd: Date, copy: boolean) {
    if (copy) {
      await createEvent.mutateAsync({
        calendarId: event.calendarId ?? "primary",
        title: event.title,
        description: event.description,
        location: event.location,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        allDay: event.allDay,
        colorId: event.colorId,
        useDefaultReminders: event.remindersUseDefault,
        reminders: event.remindersUseDefault ? undefined : event.reminders,
      });
    } else {
      await updateEvent.mutateAsync({
        id: event.id,
        calendarId: event.calendarId ?? "primary",
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
    }
  }

  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>("week");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultEndDate, setDefaultEndDate] = useState<Date | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Clear month-view selection when leaving month view.
  useEffect(() => {
    if (view !== "month") setSelectedDay(null);
  }, [view]);

  useEffect(() => {
    if (!filterOpen) return;
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const range = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      return { from: startOfWeek(monthStart), to: endOfWeek(monthEnd) };
    }
    if (view === "week") {
      return { from: startOfWeek(date), to: endOfWeek(date) };
    }
    if (view === "agenda") {
      return { from: startOfDay(date), to: endOfDay(addDays(date, AGENDA_DAYS_AHEAD - 1)) };
    }
    return { from: startOfDay(date), to: endOfDay(date) };
  }, [date, view]);

  const { data, isLoading } = useCalendarEvents(
    range.from,
    range.to,
    selectedCalendarIds,
  );
  const events = data?.events ?? [];

  function goPrev() {
    if (view === "month") setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    else if (view === "week") setDate(addDays(date, -7));
    else if (view === "agenda") setDate(addDays(date, -AGENDA_DAYS_AHEAD));
    else setDate(addDays(date, -1));
  }
  function goNext() {
    if (view === "month") setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    else if (view === "week") setDate(addDays(date, 7));
    else if (view === "agenda") setDate(addDays(date, AGENDA_DAYS_AHEAD));
    else setDate(addDays(date, 1));
  }
  function goToday() { setDate(new Date()); setSelectedDay(null); }

  function openNew(start?: Date, end?: Date) {
    setEditing(null);
    setDefaultDate(start);
    setDefaultEndDate(end);
    setFormOpen(true);
  }
  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setDefaultDate(undefined);
    setFormOpen(true);
  }

  const headerLabel = useMemo(() => {
    if (view === "month") {
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      const sameMonth = start.getMonth() === end.getMonth();
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: sameMonth ? undefined : "short", day: "numeric", year: "numeric" })}`;
    }
    if (view === "agenda") {
      const end = addDays(date, AGENDA_DAYS_AHEAD - 1);
      return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [date, view]);

  const effective = selectedCalendarIds ?? calendars.filter((c) => c.selected).map((c) => c.id);
  const allSelected = effective.length === calendars.length && calendars.length > 0;
  const noneSelected = effective.length === 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="glass" size="icon" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="glass" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="glass" size="icon" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-1 truncate text-base font-medium tracking-tight text-white sm:ml-2 sm:text-lg">
            {headerLabel}
          </div>
          {isLoading && (
            <div className="ml-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar filter dropdown */}
          {calendars.length > 0 && (
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "glass flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  filterOpen
                    ? "text-white ring-1 ring-emerald-500/40"
                    : "text-muted-foreground hover:text-white",
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Calendars</span>
                {!allSelected && !noneSelected && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
                    {effective.length}
                  </span>
                )}
                {noneSelected && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-300">
                    0
                  </span>
                )}
              </button>

              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="glass absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl shadow-xl"
                  >
                    <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        My Calendars
                      </span>
                      <button
                        onClick={() => onSetManyCalendars(allSelected ? [] : calendars.map((c) => c.id))}
                        className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-emerald-300"
                      >
                        {allSelected ? "None" : "All"}
                      </button>
                    </div>
                    <ul className="py-2">
                      {calendars.map((cal) => {
                        const checked = effective.includes(cal.id);
                        return (
                          <li key={cal.id}>
                            <button
                              onClick={() => onToggleCalendar(cal.id)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                            >
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all",
                                  checked ? "border-transparent" : "border-white/20",
                                )}
                                style={{ backgroundColor: checked ? cal.backgroundColor : "transparent" }}
                              >
                                {checked && (
                                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" style={{ color: cal.foregroundColor }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="2 6 5 9 10 3" />
                                  </svg>
                                )}
                              </span>
                              <span className={cn("flex-1 truncate text-sm transition-colors", checked ? "text-white" : "text-muted-foreground")}>
                                {cal.name}
                              </span>
                              {cal.primary && (
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                                  main
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* View toggle */}
          <div className="glass flex rounded-full p-1">
            {(["month", "week", "day", "agenda"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors sm:px-3.5",
                  view === v
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "text-muted-foreground hover:text-white",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <Button onClick={() => openNew(date)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "month" && (
          <div key="month-wrap" className="space-y-4">
            <MonthView
              date={date}
              events={events}
              selectedDay={selectedDay}
              onDayClick={(d) => {
                // Toggle: tapping the already-selected day closes the strip.
                setSelectedDay((cur) => (cur && isSameDay(cur, d) ? null : d));
              }}
              onEventClick={openEdit}
            />
            {selectedDay && (
              <SelectedDayStrip
                day={selectedDay}
                events={getEventsForDay(events, selectedDay)}
                onEventClick={openEdit}
                onNewEvent={() => openNew(selectedDay)}
                onOpenDay={() => { setDate(selectedDay); setView("day"); }}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </div>
        )}
        {view === "week" && (
          <WeekView
            date={date}
            events={events}
            onSlotClick={(s, e) => openNew(s, e)}
            onEventClick={openEdit}
            onEventDrop={handleEventDrop}
          />
        )}
        {view === "day" && (
          <DayView
            date={date}
            events={events}
            onSlotClick={(s, e) => openNew(s, e)}
            onEventClick={openEdit}
            onEventDrop={handleEventDrop}
          />
        )}
        {view === "agenda" && (
          <AgendaView
            date={date}
            events={events}
            onEventClick={openEdit}
          />
        )}
      </AnimatePresence>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editing}
        defaultDate={defaultDate}
        defaultEndDate={defaultEndDate}
      />
    </div>
  );
}

// ─── Selected-day strip (shown below month view) ─────────────────────

type StripProps = {
  day: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: () => void;
  onOpenDay: () => void;
  onClose: () => void;
};

function SelectedDayStrip({ day, events, onEventClick, onNewEvent, onOpenDay, onClose }: StripProps) {
  const today = new Date();
  const isToday = isSameDay(day, today);
  const weekday = day.toLocaleDateString("en-US", { weekday: "long" });
  const rest = day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <motion.div
      key={day.toISOString()}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl text-center",
            isToday
              ? "bg-emerald-500 text-black shadow-[0_0_16px_rgba(16,185,129,0.4)]"
              : "border border-white/10 text-white",
          )}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
            {day.toLocaleDateString("en-US", { weekday: "short" })}
          </span>
          <span className="text-base font-semibold leading-tight">{day.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{weekday}</div>
          <div className="truncate text-xs text-muted-foreground">{rest}</div>
        </div>
        <button
          onClick={onOpenDay}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Open day view"
        >
          <span className="hidden sm:inline">Open day</span>
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          onClick={onClose}
          className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
        >
          Close
        </button>
      </div>

      {events.length === 0 ? (
        <button
          onClick={onNewEvent}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Nothing scheduled — tap to add
        </button>
      ) : (
        <ul className="space-y-1.5">
          {events.map((event) => (
            <li key={event.id}>
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
                  <div className="truncate text-sm font-medium text-white">{event.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {event.allDay
                      ? "All day"
                      : `${formatTime(event.start)} – ${formatTime(event.end)}`}
                    {event.location && <span> · {event.location}</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
