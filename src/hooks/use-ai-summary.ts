"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WeeklySummaryData = {
  summary: string;
  highlights: string[];
  generatedAt: string;
  cached: boolean;
};

export function useWeeklySummary() {
  return useQuery<WeeklySummaryData>({
    queryKey: ["weekly-summary"],
    queryFn: () => fetch("/api/ai/weekly-summary").then((r) => r.json()),
    staleTime: 1000 * 60 * 60, // 1 hour — summaries are cached server-side per week
    retry: false,
  });
}

export function useRegenerateSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/ai/weekly-summary", { method: "POST" }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.setQueryData(["weekly-summary"], data);
    },
  });
}
