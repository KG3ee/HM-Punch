CREATE TYPE "DeductionCategory" AS ENUM ('PUNCH_LATE', 'BREAK_LATE');

CREATE TYPE "DeductionSourceType" AS ENUM ('DUTY_SESSION', 'BREAK_SESSION');

CREATE TABLE "DeductionTier" (
  "id" TEXT NOT NULL,
  "category" "DeductionCategory" NOT NULL,
  "occurrenceNo" INTEGER NOT NULL,
  "amountAed" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeductionTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeductionEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" "DeductionCategory" NOT NULL,
  "sourceType" "DeductionSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "localDate" TEXT NOT NULL,
  "periodMonth" TEXT NOT NULL,
  "occurrenceNo" INTEGER NOT NULL,
  "amountAed" DECIMAL(10, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "lateMinutesSnapshot" INTEGER,
  "breakOvertimeMinutesSnapshot" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeductionEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeductionTier_category_occurrenceNo_key" ON "DeductionTier"("category", "occurrenceNo");
CREATE INDEX "DeductionTier_category_idx" ON "DeductionTier"("category");

CREATE UNIQUE INDEX "DeductionEntry_sourceType_sourceId_key" ON "DeductionEntry"("sourceType", "sourceId");
CREATE INDEX "DeductionEntry_userId_periodMonth_category_idx" ON "DeductionEntry"("userId", "periodMonth", "category");
CREATE INDEX "DeductionEntry_periodMonth_category_idx" ON "DeductionEntry"("periodMonth", "category");

ALTER TABLE "DeductionEntry" ADD CONSTRAINT "DeductionEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
