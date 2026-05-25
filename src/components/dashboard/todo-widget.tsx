"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Circle, Plus, X } from "lucide-react";
import { GlassCard, CardLabel } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCalendarStatus } from "@/hooks/use-calendar";
import { useCreateTask, useTaskLists, useTasks, useUpdateTask } from "@/hooks/use-tasks";

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
  const { data: listsData } = useTaskLists();
  const toggle = useUpdateTask();
  const create = useCreateTask();

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const defaultListId = listsData?.lists?.[0]?.id;

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

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const title = newTitle.trim();
    if (!title || !defaultListId) return;
    await create.mutateAsync({ listId: defaultListId, title });
    setNewTitle("");
    setAdding(false);
  }

  return (
    <GlassCard delay={delay} className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <Link href="/schedule" className="group flex items-start gap-2">
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
          <ArrowUpRight className="mt-0.5 h-4.5 w-4.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
        </Link>
        {tasksConnected && (
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            aria-label={adding ? "Cancel new task" : "Add a task"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
              adding
                ? "border-white/15 bg-white/[0.05] text-muted-foreground hover:text-white"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
            )}
          >
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>

      {adding && tasksConnected && (
        <form onSubmit={submitNew} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={defaultListId ? "New task…" : "Loading lists…"}
            disabled={!defaultListId || create.isPending}
            autoFocus
            className="h-9 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-muted-foreground focus:border-emerald-500/40 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || !defaultListId || create.isPending}
            className="h-9 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
          >
            {create.isPending ? "Adding…" : "Add"}
          </button>
        </form>
      )}

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
