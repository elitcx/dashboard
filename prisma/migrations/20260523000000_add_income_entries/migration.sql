-- Create new IncomeEntry table
CREATE TABLE "IncomeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncomeEntry_userId_idx" ON "IncomeEntry"("userId");
CREATE INDEX "IncomeEntry_userId_date_idx" ON "IncomeEntry"("userId", "date");

ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing WeeklyIncome rows → IncomeEntry (one entry per weekly record, dated at weekStart)
INSERT INTO "IncomeEntry" ("id", "userId", "amount", "source", "date", "createdAt", "updatedAt")
SELECT "id", "userId", "amount", 'Migrated weekly income', "weekStart", "createdAt", "updatedAt"
FROM "WeeklyIncome";

-- Drop FK from Expense → WeeklyIncome and remove the column
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_weeklyIncomeId_fkey";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "weeklyIncomeId";

-- Drop the old WeeklyIncome table
DROP TABLE "WeeklyIncome";
