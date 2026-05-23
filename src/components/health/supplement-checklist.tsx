"use client";

import { motion } from "framer-motion";
import { Sun, Sunset, Moon, Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useSupplements,
  useSupplementLogs,
  useToggleSupplement,
  useCreateSupplement,
  useDeleteSupplement,
  type SupplementSchedule,
} from "@/hooks/use-health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIME_SLOTS = [
  { id: "MORNING" as const, label: "Morning", Icon: Sun },
  { id: "EVENING" as const, label: "Evening", Icon: Sunset },
  { id: "NIGHT" as const, label: "Night", Icon: Moon },
];

function SupplementItem({
  supplement,
  taken,
  onToggle,
  onDelete,
}: {
  supplement: SupplementSchedule;
  taken: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3">
      <button
        onClick={onToggle}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
          taken
            ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
            : "border-white/20 bg-white/[0.03] text-transparent hover:border-emerald-500/40",
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            taken ? "text-muted-foreground line-through" : "text-white",
          )}
        >
          {supplement.name}
        </span>
        {supplement.dosage && (
          <span className="ml-2 text-xs text-muted-foreground">{supplement.dosage}</span>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddSupplementForm({
  timeOfDay,
  onDone,
}: {
  timeOfDay: "MORNING" | "EVENING" | "NIGHT";
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const create = useCreateSupplement();

  async function submit() {
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), dosage: dosage.trim() || undefined, timeOfDay });
    setName("");
    setDosage("");
    onDone();
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Supplement name"
        className="!h-8 flex-1 text-sm"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <Input
        value={dosage}
        onChange={(e) => setDosage(e.target.value)}
        placeholder="Dose"
        className="!h-8 w-20 text-sm"
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button size="sm" onClick={submit} disabled={create.isPending} className="h-8 px-3 text-xs">
        Add
      </Button>
      <button onClick={onDone} className="text-xs text-muted-foreground hover:text-white">
        Cancel
      </button>
    </div>
  );
}

function TimeSlotSection({
  slot,
  supplements,
  takenIds,
  date,
}: {
  slot: (typeof TIME_SLOTS)[number];
  supplements: SupplementSchedule[];
  takenIds: Set<string>;
  date: string;
}) {
  const [adding, setAdding] = useState(false);
  const toggle = useToggleSupplement(date);
  const del = useDeleteSupplement();
  const { Icon } = slot;
  const taken = supplements.filter((s) => takenIds.has(s.id)).length;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
          <span className="text-sm font-medium text-white">{slot.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {supplements.length > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {taken}/{supplements.length}
            </span>
          )}
          <button
            onClick={() => setAdding(true)}
            className="rounded-full p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {supplements.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">No supplements — click + to add</p>
      ) : (
        <div className="space-y-2.5">
          {supplements.map((s) => (
            <SupplementItem
              key={s.id}
              supplement={s}
              taken={takenIds.has(s.id)}
              onToggle={() => toggle.mutate(s.id)}
              onDelete={() => del.mutate(s.id)}
            />
          ))}
        </div>
      )}

      {adding && (
        <div className={supplements.length > 0 ? "mt-3" : ""}>
          <AddSupplementForm timeOfDay={slot.id} onDone={() => setAdding(false)} />
        </div>
      )}
    </div>
  );
}

export function SupplementChecklist({ date }: { date?: string }) {
  const today = date ?? new Date().toISOString().slice(0, 10);
  const { data: supData, isLoading } = useSupplements();
  const { data: logData } = useSupplementLogs(today);

  const schedules = supData?.schedules ?? [];
  const takenIds = new Set((logData?.logs ?? []).map((l) => l.scheduleId));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-5">
        <h3 className="text-base font-medium text-white">Supplements</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {takenIds.size} of {schedules.length} taken today
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {TIME_SLOTS.map((slot) => (
            <TimeSlotSection
              key={slot.id}
              slot={slot}
              supplements={schedules.filter((s) => s.timeOfDay === slot.id)}
              takenIds={takenIds}
              date={today}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
