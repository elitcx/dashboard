"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hexToRgba,
  isSameDay,
  formatTime,
  getEventsForDay,
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
const PX_PER_HOUR = 80;
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

export function DayView({ date, events, onSlotClick, onEventClick, onEventDrop }: Props) {
  const today = new Date();
  const isToday = isSameDay(date, today);
  const dayEvents = getEventsForDay(events, date);
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const laidOut = layoutTimedEvents(timedEvents);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const colRef = useRef<HTMLDivElement | null>(null);
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

  const nowMin = minutesSinceMidnight(now);

  const dragStateRef = useRef<{
    anchorMin: number;
    startMin: number;
    endMin: number;
  } | null>(null);
  const [dragSel, setDragSel] = useState<{ startMin: number; endMin: number } | null>(null);

  // Event drag-to-move / drag-to-resize state
  const eventDragLiveRef = useRef<{
    event: CalendarEvent;
    type: "move" | "resize";
    offsetMin: number;
    durMin: number;
    startMin: number;
    endMin: number;
    hasDragged: boolean;
  } | null>(null);
  const [eventDrag, setEventDrag] = useState<{
    event: CalendarEvent;
    startMin: number;
    endMin: number;
    copy: boolean;
  } | null>(null);

  function startEventDrag(
    ev: CalendarEvent,
    type: "move" | "resize",
    e: React.MouseEvent,
  ) {
    if (e.button !== 0) return;
    if (ev.readOnly) return;
    e.stopPropagation();
    e.preventDefault();

    const col = colRef.current;
    if (!col) return;

    const origStart = minutesSinceMidnight(new Date(ev.start));
    const origEnd = minutesSinceMidnight(new Date(ev.end));
    const durMin = Math.max(15, origEnd - origStart);

    const getY = (cy: number) => cy - col.getBoundingClientRect().top;
    const rawMouseMin = (getY(e.clientY) / PX_PER_HOUR) * 60;
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

      const mouseMin = (getY(me.clientY) / PX_PER_HOUR) * 60;

      if (live.type === "move") {
        const rawStart = snapToGrid(mouseMin - live.offsetMin);
        const clamped = Math.max(0, Math.min(1440 - live.durMin, rawStart));
        live.startMin = clamped;
        live.endMin = clamped + live.durMin;
      } else {
        live.endMin = Math.min(
          1440,
          Math.max(live.startMin + 15, snapToGrid(mouseMin)),
        );
      }

      setEventDrag({
        event: live.event,
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
      eventDragLiveRef.current = null;
      setEventDrag(null);

      if (!live?.hasDragged) return;

      const newStart = new Date(date);
      newStart.setHours(Math.floor(live.startMin / 60), live.startMin % 60, 0, 0);
      const newEnd = new Date(date);
      newEnd.setHours(Math.floor(live.endMin / 60), live.endMin % 60, 0, 0);
      onEventDrop(live.event, newStart, newEnd, me.altKey);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    if (e.button !== 0) return;
    e.preventDefault();

    const col = colRef.current;
    if (!col) return;

    const getY = (cy: number) => cy - col.getBoundingClientRect().top;
    const anchorMin = snapToGrid(
      Math.max(0, Math.min(1425, (getY(e.clientY) / PX_PER_HOUR) * 60)),
    );

    dragStateRef.current = { anchorMin, startMin: anchorMin, endMin: anchorMin + 60 };
    setDragSel({ startMin: anchorMin, endMin: anchorMin + 60 });

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
      setDragSel({ startMin: selStart, endMin: finalEnd });
    }

    function onUp() {
      const ds = dragStateRef.current;
      if (ds) {
        const startDate = new Date(date);
        startDate.setHours(Math.floor(ds.startMin / 60), ds.startMin % 60, 0, 0);
        const endDate = new Date(date);
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
    <motion.div
      key={`day-${date.toISOString()}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass overflow-hidden rounded-3xl"
    >
      {/* Day header */}
      <div className="flex items-center gap-5 border-b border-white/5 px-7 py-5">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl",
            isToday
              ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.45)]"
              : "border border-white/10 text-white",
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {date.toLocaleDateString("en-US", { weekday: "short" })}
          </span>
          <span className="text-xl font-semibold leading-tight">{date.getDate()}</span>
        </div>
        <div>
          <div className="text-xl font-semibold text-white">
            {date.toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        {timedEvents.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="text-2xl font-semibold text-white">{timedEvents.length}</span>
            <span>{timedEvents.length === 1 ? "event" : "events"}</span>
          </div>
        )}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-white/5 px-7 py-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            All day
          </div>
          <div className="space-y-2">
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="block w-full rounded-xl py-2.5 pl-4 pr-3 text-left text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{
                  backgroundColor: hexToRgba(event.background, 0.2),
                  borderLeft: `3px solid ${event.background}`,
                  boxShadow: `inset 0 0 0 1px ${hexToRgba(event.background, 0.2)}`,
                }}
              >
                {event.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div
        ref={scrollRef}
        className="relative grid select-none grid-cols-[72px_1fr] overflow-y-auto"
        style={{ maxHeight: "72vh" }}
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
                <span className="absolute -top-2.5 right-4 text-[11px] font-medium tabular-nums text-muted-foreground/60">
                  {hourLabel(h)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Events column */}
        <div
          ref={colRef}
          className={cn(
            "relative cursor-crosshair border-l border-white/5",
            isToday && "bg-white/[0.01]",
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

          {/* Now line */}
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
          {dragSel && (
            <div
              className="pointer-events-none absolute inset-x-1 z-30 overflow-hidden rounded-xl border border-emerald-500/50 bg-emerald-500/15"
              style={{
                top: (dragSel.startMin / 60) * PX_PER_HOUR,
                height: Math.max(20, ((dragSel.endMin - dragSel.startMin) / 60) * PX_PER_HOUR),
              }}
            >
              <div className="px-3 pt-1.5 text-[11px] font-semibold text-emerald-300">
                {fmtMins(dragSel.startMin)} – {fmtMins(dragSel.endMin)}
              </div>
            </div>
          )}

          {/* Events */}
          {laidOut.map(({ event, col, colSpan, totalCols }) => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const startMin = minutesSinceMidnight(start);
            const durMin = Math.max(25, (end.getTime() - start.getTime()) / 60_000);
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
                  if (!eventDragLiveRef.current?.hasDragged) onEventClick(event);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onEventClick(event); }
                }}
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).dataset.resize) return;
                  startEventDrag(event, "move", e);
                }}
                style={{
                  top,
                  height,
                  left: `calc(${leftPct}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                  backgroundColor: hexToRgba(event.background, isBeingMoved ? 0.09 : 0.18),
                  borderLeft: `3px solid ${event.background}`,
                  boxShadow: `inset 0 0 0 1px ${hexToRgba(event.background, 0.2)}`,
                  opacity: isBeingMoved ? 0.45 : 1,
                }}
                className="absolute z-10 cursor-grab select-none overflow-hidden rounded-r-xl rounded-l-none px-3 py-2 text-left text-white transition-opacity hover:z-30 hover:brightness-125"
              >
                <div className="pointer-events-none truncate text-sm font-semibold leading-tight">
                  {event.title}
                </div>
                {height > 40 && (
                  <div className="pointer-events-none mt-0.5 truncate text-[11px] text-white/60">
                    {formatTime(event.start)} – {formatTime(event.end)}
                  </div>
                )}
                {height > 72 && event.location && (
                  <div className="pointer-events-none mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-white/50">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                {height > 72 && event.meetingUrl && !event.location && (
                  <div className="pointer-events-none mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-white/50">
                    <Video className="h-3 w-3 shrink-0" />
                    <span>Google Meet</span>
                  </div>
                )}
                {!event.readOnly && height > 30 && (
                  <div
                    data-resize="true"
                    className="absolute inset-x-0 bottom-0 h-3 cursor-s-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startEventDrag(event, "resize", e);
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Ghost event during drag */}
          {eventDrag && (
            <div
              className="pointer-events-none absolute inset-x-1 z-40 overflow-hidden rounded-r-xl rounded-l-none px-3 py-2"
              style={{
                top: (eventDrag.startMin / 60) * PX_PER_HOUR,
                height: Math.max(25, ((eventDrag.endMin - eventDrag.startMin) / 60) * PX_PER_HOUR),
                backgroundColor: hexToRgba(eventDrag.event.background, 0.55),
                borderLeft: `3px solid ${eventDrag.event.background}`,
                boxShadow: `0 0 0 2px ${hexToRgba(eventDrag.event.background, 0.5)}`,
              }}
            >
              <div className="text-[11px] font-semibold text-white">
                {fmtMins(eventDrag.startMin)} – {fmtMins(eventDrag.endMin)}
              </div>
              {eventDrag.copy && (
                <div className="text-[10px] text-white/70">+ Copy</div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
