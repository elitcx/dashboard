"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalendarEvent,
  CalendarListEntry,
  EventReminder,
} from "@/lib/google-calendar";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Request failed: ${res.status}`,
    );
  }
  return res.json();
}

export function useCalendarStatus() {
  return useQuery({
    queryKey: ["calendar", "status"],
    queryFn: () =>
      fetchJson<{ connected: boolean; tasksConnected: boolean }>(
        "/api/calendar/status",
      ),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useCalendarList() {
  return useQuery({
    queryKey: ["calendar", "list"],
    queryFn: () =>
      fetchJson<{
        calendars: CalendarListEntry[];
        connected: boolean;
        eventColors: Record<string, { name: string; background: string; foreground: string }>;
      }>("/api/calendar/calendars"),
    staleTime: 5 * 60_000,
  });
}

// LocalStorage-backed selection of which calendars to render.
const STORAGE_KEY = "dashboard:selectedCalendarIds:v1";

export function useSelectedCalendarIds(allIds: string[]) {
  const [selected, setSelected] = useState<string[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSelected(parsed.filter((id) => typeof id === "string"));
          return;
        }
      } catch {
        /* fall through */
      }
    }
    setSelected(null); // null = "no preference; use server default (all selected)"
  }, []);

  // Drop ids that no longer exist (e.g. a calendar was unsubscribed elsewhere).
  useEffect(() => {
    if (selected === null) return;
    if (allIds.length === 0) return;
    const pruned = selected.filter((id) => allIds.includes(id));
    if (pruned.length !== selected.length) {
      setSelected(pruned);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    }
  }, [allIds, selected]);

  function toggle(id: string) {
    setSelected((curr) => {
      const base = curr ?? allIds;
      const next = base.includes(id)
        ? base.filter((x) => x !== id)
        : [...base, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function setMany(ids: string[]) {
    setSelected(ids);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  return { selected, toggle, setMany } as const;
}

export function useCalendarEvents(
  from: Date,
  to: Date,
  calendarIds?: string[] | null,
) {
  const ids = calendarIds === null || calendarIds === undefined
    ? undefined
    : calendarIds.join(",");
  const idsKey = ids ?? "__default__";

  return useQuery({
    queryKey: ["calendar", "events", from.toISOString(), to.toISOString(), idsKey],
    queryFn: () => {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      if (ids !== undefined) params.set("calendarIds", ids);
      return fetchJson<{ events: CalendarEvent[]; connected: boolean }>(
        `/api/calendar/events?${params.toString()}`,
      );
    },
    refetchInterval: 60_000,
  });
}

type EventInput = {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
  colorId?: string;
  reminders?: EventReminder[];
  useDefaultReminders?: boolean;
  addMeet?: boolean;
  recurrence?: string[];
};

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: EventInput) =>
      fetchJson<{ event: CalendarEvent }>("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}

export function useGetEvent(id: string | undefined, calendarId: string | undefined) {
  return useQuery({
    queryKey: ["calendar", "event", id, calendarId],
    queryFn: () =>
      fetchJson<{ event: CalendarEvent }>(
        `/api/calendar/events/${id}?calendarId=${encodeURIComponent(calendarId ?? "primary")}`,
      ),
    enabled: Boolean(id && calendarId),
    staleTime: 30_000,
  });
}

type EventPatchInput = { id: string; calendarId: string } & Partial<
  Omit<EventInput, "calendarId" | "colorId">
> & { colorId?: string | null };

export function useUpdateEvent() {
  const qc = useQueryClient();
  type EvData = { events: CalendarEvent[]; connected: boolean };
  return useMutation({
    mutationFn: ({ id, ...patch }: EventPatchInput) =>
      fetchJson<{ event: CalendarEvent }>(`/api/calendar/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["calendar", "events"] });
      const snapshot = qc.getQueriesData<EvData>({ queryKey: ["calendar", "events"] });
      qc.setQueriesData<EvData>({ queryKey: ["calendar", "events"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          events: old.events.map((ev) =>
            ev.id === patch.id
              ? {
                  ...ev,
                  ...(patch.start != null && { start: patch.start }),
                  ...(patch.end != null && { end: patch.end }),
                  ...(patch.title != null && { title: patch.title }),
                  ...(patch.description != null && { description: patch.description }),
                  ...(patch.location != null && { location: patch.location }),
                  ...(patch.allDay != null && { allDay: patch.allDay }),
                }
              : ev,
          ),
        };
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, calendarId }: { id: string; calendarId: string }) =>
      fetchJson<{ success: boolean }>(
        `/api/calendar/events/${id}?calendarId=${encodeURIComponent(calendarId)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}
