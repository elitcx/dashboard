"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { useCalendarList, useSelectedCalendarIds } from "@/hooks/use-calendar";
import { cn } from "@/lib/utils";

type Props = {
  selectedIds: string[] | null;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[]) => void;
};

export function CalendarList({ selectedIds, onToggle, onSetMany }: Props) {
  const { data, isLoading } = useCalendarList();
  const calendars = data?.calendars ?? [];

  const effective = selectedIds ?? calendars.filter((c) => c.selected).map((c) => c.id);
  const allSelected = effective.length === calendars.length && calendars.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
          <h3 className="text-sm font-medium tracking-tight text-white">
            Calendars
          </h3>
        </div>
        {calendars.length > 1 && (
          <button
            onClick={() =>
              onSetMany(allSelected ? [] : calendars.map((c) => c.id))
            }
            className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-emerald-300"
          >
            {allSelected ? "None" : "All"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-14 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : calendars.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs text-muted-foreground">
          No calendars found.
        </div>
      ) : (
        <ul className="space-y-1">
          {calendars.map((cal) => {
            const checked = effective.includes(cal.id);
            return (
              <li key={cal.id}>
                <button
                  onClick={() => onToggle(cal.id)}
                  className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all",
                      checked ? "border-transparent" : "border-white/20",
                    )}
                    style={{
                      backgroundColor: checked ? cal.backgroundColor : "transparent",
                    }}
                  >
                    {checked && (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-2.5 w-2.5"
                        style={{ color: cal.foregroundColor }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm transition-colors",
                      checked ? "text-white" : "text-muted-foreground",
                    )}
                  >
                    {cal.name}
                  </span>
                  {cal.primary && (
                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      Main
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
