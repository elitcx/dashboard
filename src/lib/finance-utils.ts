/** Returns the Monday (UTC) of the week containing `date`. */
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/** Returns the Sunday (UTC) of the week (6 days after weekStart). */
export function weekEnd(start: Date): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}

export function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type AllocationPercents = {
  lockedPct: number;
  fundPct: number;
  skillPct: number;
  flexPct: number;
};

export type AllocationLabels = {
  lockedLabel: string;
  fundLabel: string;
  skillLabel: string;
  flexLabel: string;
};

export type AllocationDescriptions = {
  lockedDesc: string;
  fundDesc: string;
  skillDesc: string;
  flexDesc: string;
};

export type FinanceConfigShape = AllocationPercents & AllocationLabels & AllocationDescriptions;

export const DEFAULT_FINANCE_CONFIG: FinanceConfigShape = {
  lockedLabel: "Locked",
  fundLabel: "Fun",
  skillLabel: "Skill",
  flexLabel: "Flex",
  lockedDesc: "Reserved, do not spend",
  fundDesc: "Fun activities & extras",
  skillDesc: "Learning & self-improvement",
  flexDesc: "Guilt free spending",
  lockedPct: 10,
  fundPct: 22.5,
  skillPct: 58.5,
  flexPct: 9,
};

/**
 * Auto-allocate income into the 4 buckets using the given percentages
 * (or defaults if none provided). Flex is computed as the remainder so the
 * four values always sum exactly to `income`.
 */
export function allocate(income: number, pct?: Partial<AllocationPercents>) {
  const p = { ...DEFAULT_FINANCE_CONFIG, ...(pct ?? {}) };
  const locked = +((income * p.lockedPct) / 100).toFixed(2);
  const fund = +((income * p.fundPct) / 100).toFixed(2);
  const skill = +((income * p.skillPct) / 100).toFixed(2);
  const flex = +(income - locked - fund - skill).toFixed(2);
  return { locked, fund, skill, flex };
}

/** Format a number as Indonesian Rupiah, e.g. "Rp 1.200.000" */
export function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/**
 * Server-side helper: fetch a user's finance config from the DB,
 * returning the defaults if none exists. Uses a dynamic import so this
 * file remains safe to import from client components (which only use the
 * formatters and pure helpers above).
 */
export async function getUserFinanceConfig(userId: string): Promise<FinanceConfigShape> {
  const { prisma } = await import("@/lib/prisma");
  const cfg = await prisma.financeConfig.findUnique({ where: { userId } });
  if (!cfg) return DEFAULT_FINANCE_CONFIG;
  return {
    lockedLabel: cfg.lockedLabel,
    fundLabel: cfg.fundLabel,
    skillLabel: cfg.skillLabel,
    flexLabel: cfg.flexLabel,
    lockedDesc: cfg.lockedDesc,
    fundDesc: cfg.fundDesc,
    skillDesc: cfg.skillDesc,
    flexDesc: cfg.flexDesc,
    lockedPct: cfg.lockedPct,
    fundPct: cfg.fundPct,
    skillPct: cfg.skillPct,
    flexPct: cfg.flexPct,
  };
}
