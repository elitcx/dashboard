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

/** Auto-allocate income into the 4 buckets. */
export function allocate(income: number) {
  const locked = +(income * 0.1).toFixed(2);
  const spendable = +(income * 0.9).toFixed(2);
  const fund = +(spendable * 0.25).toFixed(2);
  const skill = +(spendable * 0.65).toFixed(2);
  const flex = +(spendable - fund - skill).toFixed(2); // avoids rounding drift
  return { locked, fund, skill, flex };
}

/** Format a number as Indonesian Rupiah, e.g. "Rp 1.200.000" */
export function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
