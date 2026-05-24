"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type SupplementSchedule = {
  id: string;
  name: string;
  dosage: string | null;
  timeOfDay: "MORNING" | "EVENING" | "NIGHT";
  isActive: boolean;
};

export type SupplementLog = {
  id: string;
  scheduleId: string;
};

export type SleepLog = {
  id: string;
  date: string;
  hoursSlept: number;
  quality: number | null;
  notes: string | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Supplements ───────────────────────────────────────────────────────

export function useSupplements() {
  return useQuery<{ schedules: SupplementSchedule[] }>({
    queryKey: ["supplements"],
    queryFn: () => fetch("/api/health/supplements").then((r) => r.json()),
  });
}

export function useCreateSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; dosage?: string; timeOfDay: "MORNING" | "EVENING" | "NIGHT" }) =>
      fetch("/api/health/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements"] }),
  });
}

export function useDeleteSupplement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/health/supplements/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements"] }),
  });
}

// ── Supplement Logs ───────────────────────────────────────────────────

export function useSupplementLogs(date?: string) {
  const d = date ?? todayStr();
  return useQuery<{ logs: SupplementLog[] }>({
    queryKey: ["supplement-logs", d],
    queryFn: () => fetch(`/api/health/supplements/log?date=${d}`).then((r) => r.json()),
  });
}

export function useToggleSupplement(date?: string) {
  const d = date ?? todayStr();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      fetch("/api/health/supplements/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, date: d }),
      }).then((r) => r.json()),
    onMutate: async (scheduleId) => {
      await qc.cancelQueries({ queryKey: ["supplement-logs", d] });
      const prev = qc.getQueryData<{ logs: SupplementLog[] }>(["supplement-logs", d]);
      qc.setQueryData<{ logs: SupplementLog[] }>(["supplement-logs", d], (old) => {
        if (!old) return old;
        const existing = old.logs.find((l) => l.scheduleId === scheduleId);
        if (existing) return { logs: old.logs.filter((l) => l.scheduleId !== scheduleId) };
        return { logs: [...old.logs, { id: "optimistic", scheduleId }] };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["supplement-logs", d], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["supplement-logs", d] }),
  });
}

// ── Water ─────────────────────────────────────────────────────────────

export function useWater(date?: string) {
  const d = date ?? todayStr();
  return useQuery<{ glasses: number; goal: number }>({
    queryKey: ["water", d],
    queryFn: () => fetch(`/api/health/water?date=${d}`).then((r) => r.json()),
  });
}

export function useUpdateWater(date?: string) {
  const d = date ?? todayStr();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (glasses: number) =>
      fetch("/api/health/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glasses, date: d }),
      }).then((r) => r.json()),
    onMutate: async (glasses) => {
      await qc.cancelQueries({ queryKey: ["water", d] });
      const prev = qc.getQueryData<{ glasses: number; goal: number }>(["water", d]);
      qc.setQueryData<{ glasses: number; goal: number }>(["water", d], (old) =>
        old ? { ...old, glasses } : { glasses, goal: 8 },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["water", d], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["water", d] }),
  });
}

// ── Sleep ─────────────────────────────────────────────────────────────

export function useSleepLogs(limit = 7) {
  return useQuery<{ logs: SleepLog[] }>({
    queryKey: ["sleep", limit],
    queryFn: () => fetch(`/api/health/sleep?limit=${limit}`).then((r) => r.json()),
  });
}

export function useLogSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; hoursSlept: number; quality?: number; notes?: string }) =>
      fetch("/api/health/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sleep"] }),
  });
}

export function useDeleteSleepLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/health/sleep/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sleep"] }),
  });
}

export function useUpdateSleepLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; hoursSlept?: number; quality?: number | null; notes?: string | null }) =>
      fetch(`/api/health/sleep/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sleep"] }),
  });
}

// ── Habits ────────────────────────────────────────────────────────────

export type Habit = {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
};

export type HabitLog = {
  id: string;
  habitId: string;
};

export function useHabits() {
  return useQuery<{ habits: Habit[] }>({
    queryKey: ["habits"],
    queryFn: () => fetch("/api/health/habits").then((r) => r.json()),
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; icon?: string }) =>
      fetch("/api/health/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/health/habits/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useHabitLogs(date?: string) {
  const d = date ?? todayStr();
  return useQuery<{ logs: HabitLog[] }>({
    queryKey: ["habit-logs", d],
    queryFn: () => fetch(`/api/health/habits/log?date=${d}`).then((r) => r.json()),
  });
}

export function useToggleHabit(date?: string) {
  const d = date ?? todayStr();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) =>
      fetch("/api/health/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: d }),
      }).then((r) => r.json()),
    onMutate: async (habitId) => {
      await qc.cancelQueries({ queryKey: ["habit-logs", d] });
      const prev = qc.getQueryData<{ logs: HabitLog[] }>(["habit-logs", d]);
      qc.setQueryData<{ logs: HabitLog[] }>(["habit-logs", d], (old) => {
        if (!old) return old;
        const existing = old.logs.find((l) => l.habitId === habitId);
        if (existing) return { logs: old.logs.filter((l) => l.habitId !== habitId) };
        return { logs: [...old.logs, { id: "optimistic", habitId }] };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["habit-logs", d], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["habit-logs", d] }),
  });
}
