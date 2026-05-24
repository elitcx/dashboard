-- Add per-bucket description fields to FinanceConfig
ALTER TABLE "FinanceConfig"
  ADD COLUMN "lockedDesc" TEXT NOT NULL DEFAULT 'Reserved — do not spend',
  ADD COLUMN "fundDesc"   TEXT NOT NULL DEFAULT 'Fun activities & extras',
  ADD COLUMN "skillDesc"  TEXT NOT NULL DEFAULT 'Learning & self-improvement',
  ADD COLUMN "flexDesc"   TEXT NOT NULL DEFAULT 'Day-to-day spending';
