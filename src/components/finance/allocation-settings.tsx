"use client";

import { useEffect, useState } from "react";
import { Lock, RotateCcw, Sparkles, Wrench, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceConfig,
  useSaveFinanceConfig,
} from "@/hooks/use-finance";
import { DEFAULT_FINANCE_CONFIG, type FinanceConfigShape } from "@/lib/finance-utils";
import { cn } from "@/lib/utils";

type Row = {
  key: "locked" | "fund" | "skill" | "flex";
  labelKey: "lockedLabel" | "fundLabel" | "skillLabel" | "flexLabel";
  descKey: "lockedDesc" | "fundDesc" | "skillDesc" | "flexDesc";
  pctKey: "lockedPct" | "fundPct" | "skillPct" | "flexPct";
  Icon: typeof Lock;
  tint: string;
  placeholder: string;
};

const ROWS: Row[] = [
  { key: "locked", labelKey: "lockedLabel", descKey: "lockedDesc", pctKey: "lockedPct", Icon: Lock, tint: "text-slate-300 ring-slate-500/20 bg-slate-500/10", placeholder: "What this bucket is for…" },
  { key: "fund", labelKey: "fundLabel", descKey: "fundDesc", pctKey: "fundPct", Icon: Sparkles, tint: "text-emerald-300 ring-emerald-500/20 bg-emerald-500/10", placeholder: "What this bucket is for…" },
  { key: "skill", labelKey: "skillLabel", descKey: "skillDesc", pctKey: "skillPct", Icon: Wrench, tint: "text-blue-300 ring-blue-500/20 bg-blue-500/10", placeholder: "What this bucket is for…" },
  { key: "flex", labelKey: "flexLabel", descKey: "flexDesc", pctKey: "flexPct", Icon: Zap, tint: "text-amber-300 ring-amber-500/20 bg-amber-500/10", placeholder: "What this bucket is for…" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AllocationSettings({ open, onOpenChange }: Props) {
  const { data } = useFinanceConfig();
  const save = useSaveFinanceConfig();

  const [draft, setDraft] = useState<FinanceConfigShape>(DEFAULT_FINANCE_CONFIG);
  const [error, setError] = useState<string | null>(null);

  // Sync draft from the latest config whenever the dialog opens.
  useEffect(() => {
    if (open && data?.config) {
      setDraft(data.config);
      setError(null);
    }
  }, [open, data?.config]);

  const total =
    Number(draft.lockedPct || 0) +
    Number(draft.fundPct || 0) +
    Number(draft.skillPct || 0) +
    Number(draft.flexPct || 0);
  const totalIsValid = Math.abs(total - 100) < 0.01;

  function setLabel(key: Row["labelKey"], value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setDesc(key: Row["descKey"], value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setPct(key: Row["pctKey"], value: number) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function resetDefaults() {
    setDraft(DEFAULT_FINANCE_CONFIG);
    setError(null);
  }

  async function onSave() {
    setError(null);
    const labels = [draft.lockedLabel, draft.fundLabel, draft.skillLabel, draft.flexLabel];
    if (labels.some((l) => !l.trim())) {
      setError("Each bucket needs a label.");
      return;
    }
    if (!totalIsValid) {
      setError(`Percentages must sum to 100 (currently ${total.toFixed(2)}).`);
      return;
    }
    try {
      await save.mutateAsync({
        lockedLabel: draft.lockedLabel.trim(),
        fundLabel: draft.fundLabel.trim(),
        skillLabel: draft.skillLabel.trim(),
        flexLabel: draft.flexLabel.trim(),
        lockedDesc: draft.lockedDesc.trim(),
        fundDesc: draft.fundDesc.trim(),
        skillDesc: draft.skillDesc.trim(),
        flexDesc: draft.flexDesc.trim(),
        lockedPct: +Number(draft.lockedPct).toFixed(2),
        fundPct: +Number(draft.fundPct).toFixed(2),
        skillPct: +Number(draft.skillPct).toFixed(2),
        flexPct: +Number(draft.flexPct).toFixed(2),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Customize allocations</DialogTitle>
          <DialogDescription>
            Rename each bucket and choose what share of every income entry it
            gets. The four percentages must sum to 100.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {ROWS.map((row) => {
            const Icon = row.Icon;
            return (
              <div
                key={row.key}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1", row.tint)}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid grid-cols-[1fr_110px] gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`label-${row.key}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Label
                        </Label>
                        <Input
                          id={`label-${row.key}`}
                          value={draft[row.labelKey]}
                          onChange={(e) => setLabel(row.labelKey, e.target.value)}
                          maxLength={30}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`pct-${row.key}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          % of income
                        </Label>
                        <div className="relative">
                          <Input
                            id={`pct-${row.key}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="0.5"
                            value={Number.isFinite(draft[row.pctKey]) ? draft[row.pctKey] : 0}
                            onChange={(e) => setPct(row.pctKey, parseFloat(e.target.value) || 0)}
                            className="h-9 pr-8"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`desc-${row.key}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Description
                      </Label>
                      <Input
                        id={`desc-${row.key}`}
                        value={draft[row.descKey]}
                        onChange={(e) => setDesc(row.descKey, e.target.value)}
                        placeholder={row.placeholder}
                        maxLength={80}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            "flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm",
            totalIsValid
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/5 text-amber-300",
          )}
        >
          <span className="font-medium">Total</span>
          <span className="font-mono">{total.toFixed(2)}%</span>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-white sm:self-center"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to defaults
          </button>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="glass" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSave} disabled={save.isPending || !totalIsValid}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
