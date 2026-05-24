"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, Star, Pencil, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSleepLogs, useLogSleep, useDeleteSleepLog, useUpdateSleepLog, type SleepLog } from "@/hooks/use-health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";

function QualityStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)}>
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              n <= value ? "fill-amber-400 text-amber-400" : "text-white/20 hover:text-amber-400/50",
            )}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function QualityStarsSmall({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)}>
          <Star
            className={cn(
              "h-3.5 w-3.5 transition-colors",
              n <= value ? "fill-amber-400 text-amber-400" : "text-white/20 hover:text-amber-400/50",
            )}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function hoursLabel(h: number) {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}

function SleepLogRow({ log }: { log: SleepLog }) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(String(log.hoursSlept));
  const [quality, setQuality] = useState(log.quality ?? 3);
  const deleteMut = useDeleteSleepLog();
  const updateMut = useUpdateSleepLog();

  function cancelEdit() {
    setHours(String(log.hoursSlept));
    setQuality(log.quality ?? 3);
    setEditing(false);
  }

  async function saveEdit() {
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) return;
    await updateMut.mutateAsync({ id: log.id, hoursSlept: h, quality });
    setEditing(false);
  }

  const dateLabel = new Date(log.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{dateLabel}</span>
        <div className="flex items-center gap-2">
          {!editing && log.quality && (
            <div className="flex gap-0.5">
              {Array.from({ length: log.quality }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} />
              ))}
            </div>
          )}
          {!editing && (
            <span className="font-mono font-medium text-white">{hoursLabel(log.hoursSlept)}</span>
          )}
          <div className="flex items-center gap-1 ml-1">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded p-0.5 text-white/30 transition-colors hover:text-white/70"
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteMut.mutate(log.id)}
                  disabled={deleteMut.isPending}
                  className="rounded p-0.5 text-white/30 transition-colors hover:text-red-400 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveEdit}
                  disabled={updateMut.isPending}
                  className="rounded p-0.5 text-emerald-400/70 transition-colors hover:text-emerald-400 disabled:opacity-40"
                  title="Save"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded p-0.5 text-white/30 transition-colors hover:text-white/70"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-7 w-20 text-sm"
              />
              <QualityStarsSmall value={quality} onChange={setQuality} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SleepLogger() {
  const { data, isLoading } = useSleepLogs(7);
  const log = useLogSleep();

  const [hours, setHours] = useState("7.5");
  const [quality, setQuality] = useState(3);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saved, setSaved] = useState(false);

  const logs = data?.logs ?? [];
  const avg = logs.length
    ? logs.reduce((s, l) => s + l.hoursSlept, 0) / logs.length
    : null;

  async function submit() {
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) return;
    await log.mutateAsync({ date, hoursSlept: h, quality });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
          <BedDouble className="h-4 w-4 text-violet-400" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-base font-medium text-white">Sleep</h3>
          <p className="text-xs text-muted-foreground">
            {avg !== null ? `7-day avg: ${hoursLabel(avg)}` : "Log your sleep"}
          </p>
        </div>
      </div>

      {/* Log form */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="sl-date">Date</Label>
          <DateTimePicker mode="date" value={date} onChange={setDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sl-hours">Hours slept</Label>
          <Input
            id="sl-hours"
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="7.5"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Quality</Label>
          <QualityStars value={quality} onChange={setQuality} />
        </div>
      </div>

      <Button
        onClick={submit}
        disabled={log.isPending}
        className={cn("w-full", saved && "bg-emerald-600/60")}
      >
        {saved ? "Saved!" : log.isPending ? "Saving..." : "Log sleep"}
      </Button>

      {/* Recent history */}
      {!isLoading && logs.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-white/5 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </p>
          {logs.slice(0, 5).map((l) => (
            <SleepLogRow key={l.id} log={l} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
