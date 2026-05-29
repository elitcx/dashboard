"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getWeekDays,
  hexToRgba,
  isSameDay,
  formatTime,
  layoutTimedEvents,
  minutesSinceMidnight,
} from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/lib/google-calendar";

type Props = {
  date: Date;
  events: CalendarEvent[];
  onSlotClick: (start: Date, end: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date, copy: boolean) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PX_PER_HOUR = 72;
const DAY_HEIGHT = PX_PER_HOUR * 24;

function hourLabel(h: number) {
  if (h === 0) return "";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function snapToGrid(mins: number): number {
  return Math.round(mins / 15) * 15;
}

function fmtMins(mins: number): string {
  const clamped = Math.max(0, Math.min(1439, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export function WeekView({ date, events, onSlotClick, onEventClick, onEventDrop }: Props) {
  const days = getWeekDays(date);
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const minutes = minutesSinceMidnight(new Date());
    const target = (minutes / 60) * PX_PER_HOUR - el.clientHeight / 3;
    el.scrollTop = Math.max(0, target);
  }, [date]);

  const dragStateRef = useRef<{
    anchorMin: number;
    startMin: number;
    endMin: number;
    dayIndex: number;
  } | null>(null);
  const [dragSel, setDragSel] = useState<{
    dayIndex: number;
    startMin: number;
    endMin: number;
  } | null>(null);

  // Set to true in onUp when a real drag occurred; consumed in the subsequent onClick to suppress edit panel
  const didJustDragRef = useRef(false);

  // Event drag-to-move / drag-to-resize state
  const eventDragLiveRef = useRef<{
    event: CalendarEvent;
    type: "move" | "resize";
    offsetMin: number;
    durMin: number;
    dayIndex: number;
    startMin: number;
    endMin: number;
    hasDragged: boolean;
  } | null>(null);
  const [eventDrag, setEventDrag] = useState<{
    event: CalendarEvent;
    dayIndex: number;
    startMin: number;
    endMin: number;
    copy: boolean;
  } | null>(null);

  function startEventDrag(
    ev: CalendarEvent,
    dayIdx: number,
    type: "move" | "resize",
    e: React.MouseEvent,
  ) {
    if (e.button !== 0) return;
    if (ev.readOnly) return;
    e.stopPropagation();
    e.preventDefault();

    const origStart = minutesSinceMidnight(new Date(ev.start));
    const origEnd = minutesSinceMidnight(new Date(ev.end));
    const durMin = Math.max(15, origEnd - origStart);

    const sc = scrollRef.current;
    const rawMouseMin = sc
      ? ((e.clientY - sc.getBoundingClientRect().top + sc.scrollTop) / PX_PER_HOUR) * 60
      : origStart;
    const offsetMin =
      type === "move"
        ? Math.max(0, Math.min(durMin, snapToGrid(rawMouseMin) - snapToGrid(origStart)))
        : 0;

    const startClientX = e.clientX;
    const startClientY = e.clientY;

    eventDragLiveRef.current = {
      event: ev,
      type,
      offsetMin,
      durMin,
      dayIndex: dayIdx,
      startMin: origStart,
      endMin: origEnd,
      hasDragged: false,
    };

    function onMove(me: MouseEvent) {
      const live = eventDragLiveRef.current;
      if (!live) return;

      if (!live.hasDragged) {
        const dx = me.clientX - startClientX;
        const dy = me.clientY - startClientY;
        if (Math.sqrt(dx * dx + dy * dy) < 5) return;
        live.hasDragged = true;
        document.body.style.cursor = "grabbing";
      }

      const sc = scrollRef.current;
      const mouseMin = sc
        ? ((me.clientY - sc.getBoundingClientRect().top + sc.scrollTop) / PX_PER_HOUR) * 60
        : live.startMin;

      if (live.type === "move") {
        let newDayIdx = live.dayIndex;
        if (sc) {
          const rect = sc.getBoundingClientRect();
          const x = me.clientX - rect.left - 64;
          const dayW = (rect.width - 64) / 7;
          newDayIdx = Math.max(0, Math.min(6, Math.floor(x / dayW)));
        }
        const rawStart = snapToGrid(mouseMin - live.offsetMin);
        const clampedStart = Math.max(0, Math.min(1440 - live.durMin, rawStart));
        live.dayIndex = newDayIdx;
        live.startMin = clampedStart;
        live.endMin = clampedStart + live.durMin;
      } else {
        live.endMin = Math.min(
          1440,
          Math.max(live.startMin + 15, snapToGrid(mouseMin)),
        );
      }

      setEventDrag({
        event: live.event,
        dayIndex: live.dayIndex,
        startMin: live.startMin,
        endMin: live.endMin,
        copy: me.altKey,
      });
    }

    function onUp(me: MouseEvent) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";

      const live = eventDragLiveRef.current;
      if (live?.hasDragged) didJustDragRef.current = true;
      eventDragLiveRef.current = null;
      setEventDrag(null);

      if (!live?.hasDragged) return;

      const targetDay = days[live.dayIndex];
      const newStart = new Date(targetDay);
      newStart.setHours(Math.floor(live.startMin / 60), live.startMin % 60, 0, 0);
      const newEnd = new Date(targetDay);
      newEnd.setHours(Math.floor(live.endMin / 60), live.endMin % 60, 0, 0);
      onEventDrop(live.event, newStart, newEnd, me.altKey);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const allDayEventsByDay = days.map((d) =>
    events.filter((e) => {
      if (!e.allDay) return false;
      const start = new Date(e.start);
      const end = new Date(e.end);
      return d >= start && d < end;
    }),
  );
  const hasAllDay = allDayEventsByDay.some((d) => d.length > 0);

  return (
    <motion.div
      key={`week-${date.toISOString()}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass overflow-hidden rounded-3xl"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
      {/* Day headers */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-white/5">
        <div />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="border-l border-white/5 px-2 py-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all",
                  isToday
                    ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    : "text-white/70 hover:bg-white/[0.06]",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {hasAllDay && (
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-white/5">
          <div className="flex items-start justify-end pr-3 pt-2.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              all day
            </span>
          </div>
          {days.map((day, i) => (
            <div key={i} className="min-h-[32px] space-y-1 border-l border-white/5 px-1 py-1.5">
              {allDayEventsByDay[i].map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="block w-full truncate rounded-md py-0.5 pl-2.5 pr-1.5 text-left text-[11px] font-semibold text-white transition-all hover:brightness-110"
                  style={{
                    backgroundColor: hexToRgba(event.background, 0.22),
                    borderLeft: `2.5px solid ${event.background}`,
                  }}
                >
                  {event.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div
        ref={scrollRef}
        className="relative grid select-none overflow-y-auto"
        style={{ maxHeight: "72vh", gridTemplateColumns: `64px repeat(7, 1fr)` }}
      >
        {/* Hours gutter */}
        <div className="relative" style={{ height: DAY_HEIGHT }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="relative px-3 text-right"
              style={{ height: PX_PER_HOUR }}
            >
              {h > 0 && (
                <span className="absolute -top-2 right-3 text-[10px] font-medium tabular-nums text-muted-foreground/60">
                  {hourLabel(h)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, i) => {
          const dayEvents = events.filter(
            (e) => !e.allDay && isSameDay(new Date(e.start), day),
          );
          const laidOut = layoutTimedEvents(dayEvents);
          const isToday = isSameDay(day, today);
          const nowMin = minutesSinceMidnight(now);
          const showDrag = dragSel?.dayIndex === i;

          function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
            if ((e.target as HTMLElement).closest("[data-event]")) return;
            if (e.button !== 0) return;
            e.preventDefault();

            const col = e.currentTarget;
            const getY = (cy: number) => cy - col.getBoundingClientRect().top;
            const anchorMin = snapToGrid(
              Math.max(0, Math.min(1425, (getY(e.clientY) / PX_PER_HOUR) * 60)),
            );

            dragStateRef.current = { anchorMin, dayIndex: i, startMin: anchorMin, endMin: anchorMin + 60 };
            setDragSel({ dayIndex: i, startMin: anchorMin, endMin: anchorMin + 60 });

            function onMove(me: MouseEvent) {
              if (!dragStateRef.current) return;
              const y = getY(me.clientY);
              const rawEnd = snapToGrid(Math.max(0, Math.min(1440, (y / PX_PER_HOUR) * 60)));
              const anchor = dragStateRef.current.anchorMin;
              const selStart = Math.min(anchor, rawEnd);
              const selEnd = Math.max(anchor, rawEnd);
              const finalEnd = selEnd - selStart < 15 ? selStart + 60 : selEnd;
              dragStateRef.current.startMin = selStart;
              dragStateRef.current.endMin = finalEnd;
              setDragSel({ dayIndex: i, startMin: selStart, endMin: finalEnd });
            }

            function onUp() {
              const ds = dragStateRef.current;
              if (ds) {
                const startDate = new Date(day);
                startDate.setHours(Math.floor(ds.startMin / 60), ds.startMin % 60, 0, 0);
                const endDate = new Date(day);
                endDate.setHours(Math.floor(ds.endMin / 60), ds.endMin % 60, 0, 0);
                onSlotClick(startDate, endDate);
              }
              dragStateRef.current = null;
              setDragSel(null);
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            }

            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }

          return (
            <div
              key={i}
              className={cn(
                "relative cursor-crosshair border-l border-white/5",
                isToday && "bg-white/[0.015]",
              )}
              style={{ height: DAY_HEIGHT }}
              onMouseDown={handleMouseDown}
            >
              {/* Hour gridlines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="pointer-events-none w-full border-b border-white/[0.04]"
                  style={{ height: PX_PER_HOUR }}
                />
              ))}

              {/* Half-hour faint lines */}
              {HOURS.map((h) => (
                <div
                  key={`half-${h}`}
                  className="pointer-events-none absolute left-0 right-0 border-b border-white/[0.02]"
                  style={{ top: (h + 0.5) * PX_PER_HOUR }}
                />
              ))}

              {/* Now indicator */}
              {isToday && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20"
                  style={{ top: (nowMin / 60) * PX_PER_HOUR }}
                >
                  <div className="relative">
                    <div className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
                    <div className="h-px w-full bg-rose-500/80" />
                  </div>
                </div>
              )}

              {/* Drag selection overlay */}
              {showDrag && dragSel && (
                <div
                  className="pointer-events-none absolute inset-x-0.5 z-30 overflow-hidden rounded-xl border border-emerald-500/50 bg-emerald-500/15"
                  style={{
                    top: (dragSel.startMin / 60) * PX_PER_HOUR,
                    height: Math.max(20, ((dragSel.endMin - dragSel.startMin) / 60) * PX_PER_HOUR),
                  }}
                >
                  <div className="px-2 pt-1 text-[10px] font-semibold text-emerald-300">
                    {fmtMins(dragSel.startMin)} – {fmtMins(dragSel.endMin)}
                  </div>
                </div>
              )}

              {/* Events */}
              {laidOut.map(({ event, col, colSpan, totalCols }) => {
                const start = new Date(event.start);
                const end = new Date(event.end);
                const startMin = minutesSinceMidnight(start);
                const durMin = Math.max(20, (end.getTime() - start.getTime()) / 60_000);
                const top = (startMin / 60) * PX_PER_HOUR;
                const height = (durMin / 60) * PX_PER_HOUR;
                const widthPct = (colSpan / totalCols) * 100;
                const leftPct = (col / totalCols) * 100;
                const isBeingMoved = eventDrag?.event.id === event.id && !eventDrag.copy;

                return (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    data-event="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (didJustDragRef.current) { didJustDragRef.current = false; return; }
                      onEventClick(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onEventClick(event); }
                    }}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).dataset.resize) return;
                      startEventDrag(event, i, "move", e);
                    }}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      backgroundColor: hexToRgba(event.background, isBeingMoved ? 0.09 : 0.18),
                      borderLeft: `3px solid ${event.background}`,
                      boxShadow: `inset 0 0 0 1px ${hexToRgba(event.background, 0.2)}`,
                      opacity: isBeingMoved ? 0.45 : 1,
                    }}
                    className="absolute z-10 cursor-grab select-none overflow-hidden rounded-r-lg rounded-l-none px-2 py-1.5 text-left text-white transition-opacity hover:z-30 hover:brightness-125"
                  >
                    <div className="pointer-events-none truncate text-xs font-semibold leading-tight">
                      {event.title}
                    </div>
                    {height > 32 && (
                      <div className="pointer-events-none mt-0.5 truncate text-[10px] text-white/60">
                        {formatTime(event.start)}
                      </div>
                    )}
                    {!event.readOnly && height > 24 && (
                      <div
                        data-resize="true"
                        className="absolute inset-x-0 bottom-0 h-3 cursor-s-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          startEventDrag(event, i, "resize", e);
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Ghost event during drag */}
              {eventDrag?.dayIndex === i && (
                <div
                  className="pointer-events-none absolute inset-x-0.5 z-40 overflow-hidden rounded-r-lg rounded-l-none px-2 py-1"
                  style={{
                    top: (eventDrag.startMin / 60) * PX_PER_HOUR,
                    height: Math.max(20, ((eventDrag.endMin - eventDrag.startMin) / 60) * PX_PER_HOUR),
                    backgroundColor: hexToRgba(eventDrag.event.background, 0.55),
                    borderLeft: `3px solid ${eventDrag.event.background}`,
                    boxShadow: `0 0 0 2px ${hexToRgba(eventDrag.event.background, 0.5)}`,
                  }}
                >
                  <div className="text-[10px] font-semibold text-white">
                    {fmtMins(eventDrag.startMin)} – {fmtMins(eventDrag.endMin)}
                  </div>
                  {eventDrag.copy && (
                    <div className="text-[9px] text-white/70">+ Copy</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
        </div>
      </div>
    </motion.div>
  );
}
