"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ViewMode,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "@/lib/calendar-utils";
import { useCalendarEvents } from "@/hooks/use-calendar";
import type { CalendarEvent, CalendarListEntry } from "@/lib/google-calendar";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { EventForm } from "./event-form";

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
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>("week");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultEndDate, setDefaultEndDate] = useState<Date | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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
    else setDate(addDays(date, -1));
  }
  function goNext() {
    if (view === "month") setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    else if (view === "week") setDate(addDays(date, 7));
    else setDate(addDays(date, 1));
  }
  function goToday() { setDate(new Date()); }

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
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [date, view]);

  const effective = selectedCalendarIds ?? calendars.filter((c) => c.selected).map((c) => c.id);
  const allSelected = effective.length === calendars.length && calendars.length > 0;
  const noneSelected = effective.length === 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="ml-2 text-lg font-medium tracking-tight text-white">
            {headerLabel}
          </div>
          {isLoading && (
            <div className="ml-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          )}
        </div>

        <div className="flex items-center gap-2">
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
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
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
            New Event
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "month" && (
          <MonthView
            date={date}
            events={events}
            onDayClick={(d) => { setDate(d); setView("day"); }}
            onEventClick={openEdit}
          />
        )}
        {view === "week" && (
          <WeekView
            date={date}
            events={events}
            onSlotClick={(s, e) => openNew(s, e)}
            onEventClick={openEdit}
          />
        )}
        {view === "day" && (
          <DayView
            date={date}
            events={events}
            onSlotClick={(s, e) => openNew(s, e)}
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
