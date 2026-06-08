"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ParsedWorkout } from "@/lib/gym-parser";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  category: string;
  isCustom: boolean;
};

type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  distance: number | null;
  notes: string | null;
  exercise: Exercise;
};

export type Workout = {
  id: string;
  name: string;
  date: string;
  dayType: string;
  duration: number | null;
  notes: string | null;
  workoutSets: WorkoutSet[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useWorkouts(limit = 30) {
  return useQuery({
    queryKey: ["gym", "workouts", limit],
    queryFn: () => fetchJson<{ workouts: Workout[] }>(`/api/gym/workouts?limit=${limit}`),
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ["gym", "exercises"],
    queryFn: () => fetchJson<{ exercises: Exercise[] }>("/api/gym/exercises"),
  });
}

export type ProgressMetricType = "e1rm" | "reps" | "duration";

export type ProgressPoint = {
  date: string;
  metric: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
};

export function useProgress(exerciseId: string | null) {
  return useQuery({
    queryKey: ["gym", "progress", exerciseId],
    queryFn: () =>
      fetchJson<{ metricType: ProgressMetricType; series: ProgressPoint[] }>(
        `/api/gym/progress?exerciseId=${exerciseId}`,
      ),
    enabled: Boolean(exerciseId),
  });
}

type CreateWorkoutInput = {
  name: string;
  date: string;
  dayType: ParsedWorkout["dayType"];
  duration?: number | null;
  notes?: string | null;
  sets: Array<{
    exerciseName: string;
    setNumber: number;
    reps?: number | null;
    weight?: number | null;
    duration?: number | null;
    notes?: string | null;
  }>;
};

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutInput) =>
      fetchJson<{ workout: Workout }>("/api/gym/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym"] });
    },
  });
}

type UpdateWorkoutInput = CreateWorkoutInput & { id: string };

export function useUpdateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWorkoutInput) =>
      fetchJson<{ workout: Workout }>(`/api/gym/workouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym"] });
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/gym/workouts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym"] });
    },
  });
}

export function useParseGemini() {
  return useMutation({
    mutationFn: ({ text, exerciseNames }: { text: string; exerciseNames?: string[] }) =>
      fetchJson<{ parsed: ParsedWorkout }>("/api/gym/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, exerciseNames }),
      }),
  });
}
