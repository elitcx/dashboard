"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWeeklySummary, useRegenerateSummary } from "@/hooks/use-ai-summary";

export function AISummaryWidget({ delay = 0 }: { delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, error } = useWeeklySummary();
  const regenerate = useRegenerateSummary();

  return (
    <GlassCard delay={delay} className="flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
          <CardLabel>Weekly Recap</CardLabel>
        </div>
        <button
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          title="Regenerate summary"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", regenerate.isPending && "animate-spin")}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="mt-0.5 h-2 w-2 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : error || !data || "error" in data ? (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">
            Could not generate summary.{" "}
            <button
              onClick={() => regenerate.mutate()}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Try again
            </button>
          </p>
          {data && "error" in data && (
            <p className="mt-2 text-xs text-muted-foreground/60 font-mono break-all">
              {(data as { error: string }).error.slice(0, 200)}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ul className="space-y-2">
            {data.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span className="text-sm text-white/90">{h}</span>
              </li>
            ))}
          </ul>

          {expanded && (
            <p className="text-sm leading-relaxed text-muted-foreground border-t border-white/5 pt-4">
              {data.summary}
            </p>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Hide narrative
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Read full summary
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground/50">
            Generated{" "}
            {new Date(data.generatedAt).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
