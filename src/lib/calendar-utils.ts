import type { CalendarEvent } from "./google-calendar";

export type ViewMode = "month" | "week" | "day" | "agenda";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(x.setDate(diff));
}
export function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthGrid(date: Date): Date[] {
  // Returns 42 days (6 weeks) starting from the Monday before/equal to the 1st of the month
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      if (e.allDay) {
        return day >= startOfDay(start) && day <= endOfDay(addDays(end, -1));
      }
      return start <= endOfDay(day) && end >= startOfDay(day);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatRange(startStr: string, endStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  return `${formatTime(startStr)} – ${formatTime(endStr)}`;
}

// ─── Overlap packing ─────────────────────────────────────────────────
// Lays out concurrent timed events into columns, Google-Calendar style.
// Returns the same events plus their assigned column, column-span, and
// the total column count for their cluster.

export type LaidOutEvent = {
  event: CalendarEvent;
  col: number;
  colSpan: number;
  totalCols: number;
};

export function layoutTimedEvents(events: CalendarEvent[]): LaidOutEvent[] {
  if (events.length === 0) return [];

  // Sort by start ascending; ties broken by longer-event-first.
  const sorted = [...events].sort((a, b) => {
    const aStart = new Date(a.start).getTime();
    const bStart = new Date(b.start).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return new Date(b.end).getTime() - new Date(a.end).getTime();
  });

  // Cluster into groups of transitively-overlapping events.
  const clusters: CalendarEvent[][] = [];
  let current: CalendarEvent[] = [];
  let currentEnd = -Infinity;

  for (const ev of sorted) {
    const start = new Date(ev.start).getTime();
    const end = new Date(ev.end).getTime();
    if (current.length === 0 || start < currentEnd) {
      current.push(ev);
      currentEnd = Math.max(currentEnd, end);
    } else {
      clusters.push(current);
      current = [ev];
      currentEnd = end;
    }
  }
  if (current.length) clusters.push(current);

  const result: LaidOutEvent[] = [];
  for (const cluster of clusters) {
    const columns: CalendarEvent[][] = [];
    const placement = new Map<string, number>();

    for (const ev of cluster) {
      const start = new Date(ev.start).getTime();
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const last = columns[c][columns[c].length - 1];
        if (new Date(last.end).getTime() <= start) {
          columns[c].push(ev);
          placement.set(ev.id, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([ev]);
        placement.set(ev.id, columns.length - 1);
      }
    }

    const totalCols = columns.length;
    for (const ev of cluster) {
      const col = placement.get(ev.id) ?? 0;
      const start = new Date(ev.start).getTime();
      const end = new Date(ev.end).getTime();
      let span = 1;
      for (let c = col + 1; c < totalCols; c++) {
        const conflict = columns[c].some((other) => {
          const oStart = new Date(other.start).getTime();
          const oEnd = new Date(other.end).getTime();
          return oStart < end && oEnd > start;
        });
        if (conflict) break;
        span++;
      }
      result.push({ event: ev, col, colSpan: span, totalCols });
    }
  }

  return result;
}

// Minutes since midnight (0–1440).
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

// Convert a hex color string to rgba.
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith("#") || hex.length < 7) {
    return `rgba(16,185,129,${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
