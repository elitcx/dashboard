-- CreateTable
CREATE TABLE "WorkoutSplitDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "dayType" "DayType" NOT NULL DEFAULT 'OTHER',
    "isRest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSplitDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitExercise" (
    "id" TEXT NOT NULL,
    "splitDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetSets" INTEGER,
    "targetReps" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SplitExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSplitDay_userId_idx" ON "WorkoutSplitDay"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSplitDay_userId_weekday_key" ON "WorkoutSplitDay"("userId", "weekday");

-- CreateIndex
CREATE INDEX "SplitExercise_splitDayId_idx" ON "SplitExercise"("splitDayId");

-- AddForeignKey
ALTER TABLE "WorkoutSplitDay" ADD CONSTRAINT "WorkoutSplitDay_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitExercise" ADD CONSTRAINT "SplitExercise_splitDayId_fkey"
    FOREIGN KEY ("splitDayId") REFERENCES "WorkoutSplitDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
