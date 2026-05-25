"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  ListTodo,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";
import { useCalendarStatus } from "@/hooks/use-calendar";
import {
  useCreateTask,
  useDeleteTask,
  useTaskLists,
  useTasks,
  useUpdateTask,
} from "@/hooks/use-tasks";
import type { GoogleTask } from "@/lib/google-calendar";

function relativeDue(dueIso: string): string {
  const date = new Date(dueIso);
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

export function TodoPanel() {
  const { data: status } = useCalendarStatus();
  const tasksConnected = status?.tasksConnected ?? false;

  const { data: listsData, isLoading: loadingLists } = useTaskLists();
  const lists = listsData?.lists ?? [];
  // Treat as disconnected if either the status check or the lists API says so.
  const fullyConnected =
    tasksConnected && (listsData === undefined || listsData.connected !== false);

  const [activeListId, setActiveListId] = useState<string | null>(null);

  useEffect(() => {
    if (activeListId) return;
    if (lists.length > 0) setActiveListId(lists[0].id);
  }, [lists, activeListId]);

  const { data: tasksData, isLoading: loadingTasks } = useTasks(
    activeListId ? [activeListId] : undefined,
  );
  const allTasks = tasksData?.tasks ?? [];

  const tasksForList = useMemo(
    () => allTasks.filter((t) => !activeListId || t.listId === activeListId),
    [allTasks, activeListId],
  );

  const pending = tasksForList.filter((t) => t.status !== "completed");
  const completed = tasksForList.filter((t) => t.status === "completed");

  const create = useCreateTask();
  const update = useUpdateTask();
  const del = useDeleteTask();

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [showNewDue, setShowNewDue] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeListId || !newTitle.trim()) return;
    try {
      await create.mutateAsync({
        listId: activeListId,
        title: newTitle.trim(),
        due: newDue ? `${newDue}T00:00:00` : undefined,
      });
      setNewTitle("");
      setNewDue("");
      setShowNewDue(false);
    } catch (err) {
      // error is shown below the form via create.error
      console.error("Failed to create task:", err);
    }
  }

  function onToggle(task: GoogleTask) {
    update.mutate({
      id: task.id,
      listId: task.listId,
      status: task.status === "completed" ? "needsAction" : "completed",
    });
  }

  function onDelete(task: GoogleTask) {
    if (!confirm("Delete this task?")) return;
    del.mutate({ id: task.id, listId: task.listId });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListTodo
            className="h-5 w-5 text-emerald-400"
            strokeWidth={1.75}
          />
          <h2 className="text-lg font-medium text-white">Tasks</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              {pending.length}
            </span>
          )}
        </div>
        {(loadingLists || loadingTasks) && (
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        )}
      </div>

      {!fullyConnected ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Tasks live in Google Tasks. Reconnect Google to grant the new
            permission.
          </p>
          <Button
            size="sm"
            variant="glass"
            onClick={() => signIn("google")}
            className="gap-1.5"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            Reconnect Google
          </Button>
        </div>
      ) : (
        <>
          {lists.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {lists.map((list) => {
                const active = list.id === activeListId;
                return (
                  <button
                    key={list.id}
                    onClick={() => setActiveListId(list.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-emerald-500/40 bg-emerald-500/15 text-white"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white",
                    )}
                  >
                    {list.title}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add task */}
          <form onSubmit={onCreate} className="mb-3 space-y-1.5">
            <div className={cn(
              "flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border bg-white/[0.02] px-2 py-1.5 transition-colors",
              create.isError ? "border-red-500/30" : "border-white/5",
            )}>
              <Plus className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); }}
                placeholder={loadingLists ? "Loading lists…" : "Add a task"}
                disabled={loadingLists && !activeListId}
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewDue((v) => !v)}
                className={cn(
                  "shrink-0 rounded-md p-1 transition-colors hover:bg-white/[0.04]",
                  showNewDue ? "text-emerald-300" : "text-muted-foreground",
                )}
                aria-label="Add due date"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
              </button>
              <Button
                type="submit"
                size="sm"
                className="shrink-0"
                disabled={!newTitle.trim() || create.isPending || (!activeListId && loadingLists)}
              >
                {create.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
            {showNewDue && (
              <DateTimePicker
                mode="date"
                value={newDue}
                onChange={setNewDue}
                placeholder="Pick a due date"
              />
            )}
            {create.isError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                {create.error instanceof Error
                  ? create.error.message
                  : "Failed to add task. Check your Google Tasks connection."}
              </div>
            )}
          </form>

          {pending.length === 0 && completed.length === 0 && !loadingTasks ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-10 text-center text-sm text-muted-foreground">
              No tasks here yet.
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="space-y-1.5">
                  {pending.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-emerald-500/20 hover:bg-white/[0.04]"
                    >
                      <button
                        onClick={() => onToggle(task)}
                        aria-label="Mark complete"
                        className="mt-0.5"
                      >
                        <Circle
                          className="h-4.5 w-4.5 text-muted-foreground transition-colors hover:text-emerald-400"
                          strokeWidth={1.75}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">
                          {task.title}
                        </div>
                        {task.notes && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {task.notes}
                          </div>
                        )}
                      </div>
                      {task.due && (
                        <span
                          className={cn(
                            "shrink-0 self-center font-mono text-xs uppercase tracking-wider",
                            new Date(task.due) < new Date()
                              ? "text-amber-300/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {relativeDue(task.due)}
                        </span>
                      )}
                      <button
                        onClick={() => onDelete(task)}
                        aria-label="Delete task"
                        className="self-center text-muted-foreground opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {completed.length > 0 && (
                <div className="mt-5 border-t border-white/5 pt-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Completed ({completed.length})
                  </div>
                  <div className="space-y-1">
                    {completed.slice(0, 6).map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-1.5 transition-colors hover:bg-white/[0.02]"
                      >
                        <button onClick={() => onToggle(task)} aria-label="Reopen">
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-400/60"
                            strokeWidth={1.75}
                          />
                        </button>
                        <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">
                          {task.title}
                        </div>
                        <button
                          onClick={() => onDelete(task)}
                          aria-label="Delete task"
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
