"use client";

import { Lightbulb, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Insight = { text: string; tone: "positive" | "neutral" | "warning" };

const TONE = {
  positive: { cls: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300", Icon: TrendingUp },
  neutral: { cls: "border-white/10 bg-white/[0.02] text-muted-foreground", Icon: Minus },
  warning: { cls: "border-amber-500/20 bg-amber-500/5 text-amber-300", Icon: TrendingDown },
};

export function AdvicePanel({ weekStr }: { weekStr: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ insights: Insight[]; error?: string }>({
    queryKey: ["finance-advice", weekStr],
    queryFn: () => fetch(`/api/ai/finance-advice?week=${weekStr}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const regenerate = useMutation({
    mutationFn: () =>
      fetch("/api/ai/finance-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekStr }),
      }).then((r) => r.json()),
    onSuccess: (d) => qc.setQueryData(["finance-advice", weekStr], d),
  });

  const insights: Insight[] = data && !("error" in data) ? data.insights ?? [] : [];
  const hasError = !isLoading && (!data || "error" in data || insights.length === 0);

  return (
    <div className="glass rounded-3xl p-6 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
          <span className="text-sm font-medium text-white">AI Financial Advice</span>
        </div>
        <button
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          title="Regenerate advice"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", regenerate.isPending && "animate-spin")}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {isLoading || regenerate.isPending ? (
        <>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>
          ))}
        </>
      ) : hasError ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Could not load advice.{" "}
            <button
              onClick={() => regenerate.mutate()}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Try again
            </button>
          </p>
          {data && "error" in data && (
            <p className="mt-1 text-xs text-muted-foreground/60 font-mono break-all">
              {(data as { error: string }).error.slice(0, 200)}
            </p>
          )}
        </div>
      ) : (
        insights.map((a, i) => {
          const { cls, Icon } = TONE[a.tone];
          return (
            <div key={i} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${cls}`}>
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <p className="text-sm leading-relaxed">{a.text}</p>
            </div>
          );
        })
      )}
    </div>
  );
}
