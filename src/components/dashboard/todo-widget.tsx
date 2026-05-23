"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle } from "lucide-react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCalendarStatus } from "@/hooks/use-calendar";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";

function relativeDue(due: string): string {
  const date = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return diff === -1 ? "Yesterday" : `${Math.abs(diff)}d ago`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TodoWidget({ delay = 0 }: { delay?: number }) {
  const { data: status } = useCalendarStatus();
  const tasksConnected = status?.tasksConnected ?? false;

  const { data, isLoading } = useTasks();
  const toggle = useUpdateTask();

  const tasks = data?.tasks ?? [];
  const visible = tasks
    .filter(
      (t) =>
        t.status !== "completed" ||
        (t.completed && Date.now() - new Date(t.completed).getTime() < 86400000),
    )
    .sort((a, b) => {
      const ad = a.due ? new Date(a.due).getTime() : Infinity;
      const bd = b.due ? new Date(b.due).getTime() : Infinity;
      return ad - bd;
    })
    .slice(0, 4);
  const pending = tasks.filter((t) => t.status !== "completed").length;

  return (
    <GlassCard delay={delay} className="flex h-full flex-col">
      <Link href="/schedule" className="group flex items-start justify-between">
        <div>
          <CardLabel>Tasks</CardLabel>
          <div className="mt-2 flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-8 w-10 rounded" />
            ) : (
              <>
                <span className="text-3xl font-medium text-white">{pending}</span>
                <span className="text-sm text-muted-foreground">pending</span>
              </>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4.5 w-4.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </Link>

      <div className="mt-6 flex-1 space-y-2.5">
        {!tasksConnected ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] px-4 text-center text-sm text-muted-foreground">
            Reconnect Google
            <br />
            to enable Google Tasks
          </div>
        ) : isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <Skeleton className="h-4.5 w-4.5 shrink-0 rounded-full" />
                <Skeleton className="h-3 flex-1 max-w-[65%]" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))}
          </>
        ) : visible.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-muted-foreground">
            All clear — no pending tasks
          </div>
        ) : (
          visible.map((task) => {
            const done = task.status === "completed";
            return (
              <button
                key={task.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle.mutate({
                    id: task.id,
                    listId: task.listId,
                    status: done ? "needsAction" : "completed",
                  });
                }}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-emerald-500/20 hover:bg-white/[0.04]"
              >
                {done ? (
                  <CheckCircle2
                    className="h-4.5 w-4.5 shrink-0 text-emerald-400"
                    strokeWidth={1.75}
                  />
                ) : (
                  <Circle
                    className="h-4.5 w-4.5 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate text-sm",
                      done
                        ? "text-muted-foreground line-through"
                        : "font-medium text-white",
                    )}
                  >
                    {task.title}
                  </div>
                </div>
                {task.due && (
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {relativeDue(task.due)}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
