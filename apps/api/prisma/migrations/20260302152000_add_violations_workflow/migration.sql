CREATE TYPE "ViolationSource" AS ENUM ('MEMBER_REPORT', 'LEADER_OBSERVED', 'ADMIN_OBSERVED');

CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'LEADER_VALID', 'LEADER_INVALID', 'CONFIRMED', 'REJECTED');

CREATE TYPE "ViolationReason" AS ENUM ('LEFT_WITHOUT_PUNCH', 'UNAUTHORIZED_ABSENCE', 'OTHER');

CREATE TYPE "ViolationLedgerType" AS ENUM ('REWARD', 'DEDUCTION');

CREATE TYPE "ViolationLedgerReason" AS ENUM ('REPORT_REWARD', 'ACCUSED_DEDUCTION', 'COLLECTIVE_DEDUCTION');

CREATE TABLE "ViolationCase" (
  "id" TEXT NOT NULL,
  "source" "ViolationSource" NOT NULL,
  "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
  "reason" "ViolationReason" NOT NULL,
  "accusedUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "localDate" TEXT NOT NULL,
  "note" TEXT,
  "leaderReviewedById" TEXT,
  "leaderReviewedAt" TIMESTAMP(3),
  "leaderReviewNote" TEXT,
  "adminReviewedById" TEXT,
  "adminReviewedAt" TIMESTAMP(3),
  "adminReviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ViolationCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ViolationPointEntry" (
  "id" TEXT NOT NULL,
  "violationCaseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ViolationLedgerType" NOT NULL,
  "reason" "ViolationLedgerReason" NOT NULL,
  "points" INTEGER NOT NULL,
  "localDate" TEXT NOT NULL,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ViolationPointEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ViolationCase_status_createdAt_idx" ON "ViolationCase"("status", "createdAt");
CREATE INDEX "ViolationCase_accusedUserId_occurredAt_idx" ON "ViolationCase"("accusedUserId", "occurredAt");
CREATE INDEX "ViolationCase_localDate_idx" ON "ViolationCase"("localDate");

CREATE INDEX "ViolationPointEntry_userId_createdAt_idx" ON "ViolationPointEntry"("userId", "createdAt");
CREATE INDEX "ViolationPointEntry_localDate_idx" ON "ViolationPointEntry"("localDate");

ALTER TABLE "ViolationCase" ADD CONSTRAINT "ViolationCase_accusedUserId_fkey"
FOREIGN KEY ("accusedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ViolationCase" ADD CONSTRAINT "ViolationCase_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ViolationCase" ADD CONSTRAINT "ViolationCase_leaderReviewedById_fkey"
FOREIGN KEY ("leaderReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ViolationCase" ADD CONSTRAINT "ViolationCase_adminReviewedById_fkey"
FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ViolationPointEntry" ADD CONSTRAINT "ViolationPointEntry_violationCaseId_fkey"
FOREIGN KEY ("violationCaseId") REFERENCES "ViolationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ViolationPointEntry" ADD CONSTRAINT "ViolationPointEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ViolationPointEntry" ADD CONSTRAINT "ViolationPointEntry_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
