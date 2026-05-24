"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  RefreshCw,
  CalendarCheck,
  ClipboardList,
  Lightbulb,
  Flag,
  Loader2,
  Clock,
  MapPin,
  Video,
  CalendarDays,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/calendar-utils";

type DayEventLite = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  timeLabel: string;
  durationLabel: string;
  durationMin: number;
  location?: string;
  meetingUrl?: string;
  calendarName?: string;
  background: string;
};

type DaySummary = {
  headline: string;
  summary: string;
  events: DayEventLite[];
  priorities: { title: string; detail: string; level: "high" | "med" | "low" }[];
  prep: string[];
  tips: string[];
  eventCount: number;
};

type ApiResponse =
  | { summary: DaySummary | null; generatedAt?: string; cached?: boolean; error?: undefined }
  | { error: string; summary?: undefined; generatedAt?: undefined; cached?: undefined };

const LEVEL_STYLES: Record<DaySummary["priorities"][number]["level"], string> = {
  high: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  med: "border-sky-500/25 bg-sky-500/5 text-sky-300",
  low: "border-white/10 bg-white/[0.02] text-muted-foreground",
};

const LEVEL_DOT: Record<DaySummary["priorities"][number]["level"], string> = {
  high: "bg-emerald-400",
  med: "bg-sky-400",
  low: "bg-muted-foreground/60",
};

type Props = {
  selectedCalendarIds: string[] | null;
};

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DaySummaryPanel({ selectedCalendarIds }: Props) {
  const date = todayStr();
  const qc = useQueryClient();

  const calIdsParam = useMemo(
    () => (selectedCalendarIds === null ? null : selectedCalendarIds.join(",")),
    [selectedCalendarIds],
  );

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["day-summary", date],
    queryFn: () => fetch(`/api/ai/day-summary?date=${date}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const generate = useMutation({
    mutationFn: async () => {
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const params = new URLSearchParams({ date, tz });
      if (calIdsParam !== null) params.set("calendarIds", calIdsParam);
      const res = await fetch(`/api/ai/day-summary?${params.toString()}`, {
        method: "POST",
      });
      return (await res.json()) as ApiResponse;
    },
    onSuccess: (resp) => qc.setQueryData(["day-summary", date], resp),
  });

  const summary = data && "summary" in data ? data.summary : null;
  const hasSummary = !!summary;
  const errorMsg =
    data && "error" in data && data.error
      ? data.error
      : generate.data && "error" in generate.data && generate.data.error
        ? generate.data.error
        : null;

  const generating = generate.isPending;

  const todayLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl"
    >
      {/* Aurora-glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(circle at 90% 100%, rgba(139,92,246,0.16), transparent 55%), radial-gradient(circle at 60% 30%, rgba(245,158,11,0.10), transparent 60%)",
        }}
      />
      <div className="glass rounded-3xl p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-sky-500/15 to-violet-500/20 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4 text-emerald-300" strokeWidth={2} />
              <span className="absolute -inset-px rounded-2xl ring-1 ring-emerald-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                  Your Day at a Glance
                </h3>
                {hasSummary && summary.eventCount > 0 && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-white/10">
                    {summary.eventCount} event{summary.eventCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{todayLabel}</p>
            </div>
          </div>

          <button
            onClick={() => generate.mutate()}
            disabled={generating}
            className={cn(
              "group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-xs font-medium transition-all",
              "bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-violet-500/20",
              "text-white ring-1 ring-emerald-400/30 hover:ring-emerald-400/60",
              "shadow-[0_0_24px_-6px_rgba(16,185,129,0.45)] hover:shadow-[0_0_32px_-4px_rgba(16,185,129,0.65)]",
              "disabled:opacity-70 disabled:cursor-not-allowed",
            )}
            title={hasSummary ? "Regenerate" : "Generate today's summary"}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} />
            ) : hasSummary ? (
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.25} />
            ) : (
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            )}
            <span>
              {generating
                ? "Reading your day…"
                : hasSummary
                  ? "Regenerate"
                  : "Generate Day Summary"}
            </span>
          </button>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait" initial={false}>
          {generating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-5 space-y-4"
            >
              <Skeleton className="h-5 w-2/3 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-11/12 rounded" />
              <Skeleton className="h-3 w-9/12 rounded" />
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                  >
                    <Skeleton className="h-3 w-1/3 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-4/5 rounded" />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-5"
            >
              <Skeleton className="h-3 w-3/4 rounded" />
            </motion.div>
          ) : errorMsg ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200"
            >
              Couldn&apos;t generate today&apos;s summary.{" "}
              <button
                onClick={() => generate.mutate()}
                className="underline underline-offset-2 hover:text-amber-100"
              >
                Try again
              </button>
              <p className="mt-1.5 text-[11px] font-mono text-amber-200/60 break-all">
                {errorMsg.slice(0, 220)}
              </p>
            </motion.div>
          ) : hasSummary ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 space-y-5"
            >
              {/* Headline + summary */}
              <div>
                <h4 className="bg-gradient-to-r from-emerald-300 via-sky-200 to-violet-300 bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:text-xl">
                  {summary.headline}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  {summary.summary}
                </p>
              </div>

              {/* Explicit events list — the straight-up schedule */}
              {summary.events && summary.events.length > 0 && (
                <Section
                  icon={
                    <CalendarDays
                      className="h-3.5 w-3.5 text-emerald-300"
                      strokeWidth={2}
                    />
                  }
                  title="Today's Schedule"
                >
                  <ul className="space-y-1.5">
                    {summary.events.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                      >
                        <span
                          className="mt-1 h-3 w-1 shrink-0 rounded-full"
                          style={{
                            backgroundColor: ev.background,
                            boxShadow: `0 0 12px ${hexToRgba(ev.background, 0.5)}`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-medium text-white">
                              {ev.title}
                            </span>
                            {ev.calendarName && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                {ev.calendarName}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 text-white/70">
                              <Clock
                                className="h-3 w-3"
                                strokeWidth={2}
                              />
                              {ev.timeLabel}
                              {!ev.allDay && (
                                <span className="text-muted-foreground/60">
                                  · {ev.durationLabel}
                                </span>
                              )}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" strokeWidth={2} />
                                <span className="truncate">{ev.location}</span>
                              </span>
                            )}
                            {!ev.location && ev.meetingUrl && (
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" strokeWidth={2} />
                                Video
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Priorities */}
                {summary.priorities.length > 0 && (
                  <Section
                    icon={<Flag className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />}
                    title="Priorities"
                    className="sm:col-span-2"
                  >
                    <ul className="space-y-2">
                      {summary.priorities.map((p, i) => (
                        <li
                          key={i}
                          className={cn(
                            "rounded-2xl border px-3.5 py-3",
                            LEVEL_STYLES[p.level],
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                LEVEL_DOT[p.level],
                              )}
                            />
                            <span className="text-sm font-medium text-white">
                              {p.title}
                            </span>
                            <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {p.level === "high"
                                ? "high"
                                : p.level === "med"
                                  ? "medium"
                                  : "low"}
                            </span>
                          </div>
                          <p className="mt-1 pl-3.5 text-[13px] leading-snug text-white/70">
                            {p.detail}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Prep */}
                {summary.prep.length > 0 && (
                  <Section
                    icon={
                      <ClipboardList
                        className="h-3.5 w-3.5 text-sky-300"
                        strokeWidth={2}
                      />
                    }
                    title="What to Prepare"
                  >
                    <ul className="space-y-2">
                      {summary.prep.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm leading-snug text-white/80"
                        >
                          <CalendarCheck
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400/70"
                            strokeWidth={2}
                          />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Tips */}
                {summary.tips.length > 0 && (
                  <Section
                    icon={
                      <Lightbulb
                        className="h-3.5 w-3.5 text-amber-300"
                        strokeWidth={2}
                      />
                    }
                    title="Tips & Advice"
                  >
                    <ul className="space-y-2">
                      {summary.tips.map((t, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm leading-snug text-white/80"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-300/80" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>

              {data && "generatedAt" in data && data.generatedAt && (
                <p className="text-[11px] text-muted-foreground/50">
                  Generated{" "}
                  {new Date(data.generatedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {data.cached ? " · cached" : ""}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-5"
            >
              <button
                onClick={() => generate.mutate()}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-white/10 px-5 py-5 text-left transition-all hover:border-emerald-400/40 hover:bg-white/[0.02]"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    Wake up to an instant overview of your day.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pulls in events from your selected calendars and writes a
                    summary, priorities, prep notes, and a few tips — in
                    seconds.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-400/30 transition-colors group-hover:bg-emerald-500/25">
                  <Sparkles className="h-3 w-3" strokeWidth={2.25} />
                  Generate
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Section({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-white/[0.015] p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h5>
      </div>
      {children}
    </div>
  );
}
