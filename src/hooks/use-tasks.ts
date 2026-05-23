"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GoogleTask, GoogleTaskList } from "@/lib/google-calendar";

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

export function useTaskLists() {
  return useQuery({
    queryKey: ["tasks", "lists"],
    queryFn: () =>
      fetchJson<{ lists: GoogleTaskList[]; connected: boolean }>(
        "/api/tasks/lists",
      ),
    staleTime: 60_000,
  });
}

export function useTasks(listIds?: string[]) {
  const idsKey = listIds === undefined ? "__all__" : listIds.join(",");
  return useQuery({
    queryKey: ["tasks", "items", idsKey],
    queryFn: () => {
      const params = new URLSearchParams();
      if (listIds !== undefined) params.set("listIds", listIds.join(","));
      const qs = params.toString();
      return fetchJson<{ tasks: GoogleTask[]; connected: boolean }>(
        `/api/tasks${qs ? `?${qs}` : ""}`,
      );
    },
    refetchInterval: 90_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      listId: string;
      title: string;
      notes?: string;
      due?: string;
    }) =>
      fetchJson<{ task: GoogleTask }>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", "items"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      listId: string;
      title?: string;
      notes?: string;
      due?: string | null;
      status?: "needsAction" | "completed";
    }) =>
      fetchJson<{ task: GoogleTask }>(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ id, status, listId }) => {
      if (status === undefined) return;
      await qc.cancelQueries({ queryKey: ["tasks", "items"] });
      const snapshots = qc.getQueriesData<{ tasks: GoogleTask[]; connected: boolean }>({
        queryKey: ["tasks", "items"],
      });
      for (const [key, value] of snapshots) {
        if (!value) continue;
        qc.setQueryData(key, {
          ...value,
          tasks: value.tasks.map((t) =>
            t.id === id && t.listId === listId
              ? {
                  ...t,
                  status,
                  completed: status === "completed" ? new Date().toISOString() : undefined,
                }
              : t,
          ),
        });
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.snapshots) return;
      for (const [key, value] of ctx.snapshots) {
        qc.setQueryData(key, value);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks", "items"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, listId }: { id: string; listId: string }) =>
      fetchJson<{ success: boolean }>(
        `/api/tasks/${id}?listId=${encodeURIComponent(listId)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", "items"] });
    },
  });
}
