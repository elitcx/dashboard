-- CreateTable
CREATE TABLE "FinanceConfig" (
    "userId" TEXT NOT NULL,
    "lockedLabel" TEXT NOT NULL DEFAULT 'Locked',
    "fundLabel" TEXT NOT NULL DEFAULT 'Fun',
    "skillLabel" TEXT NOT NULL DEFAULT 'Skill',
    "flexLabel" TEXT NOT NULL DEFAULT 'Flex',
    "lockedPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "fundPct" DOUBLE PRECISION NOT NULL DEFAULT 22.5,
    "skillPct" DOUBLE PRECISION NOT NULL DEFAULT 58.5,
    "flexPct" DOUBLE PRECISION NOT NULL DEFAULT 9,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceConfig_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "FinanceConfig" ADD CONSTRAINT "FinanceConfig_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
