-- Reconcile: add all schema objects that were applied via `prisma db push`
-- but never recorded as migration files.
-- Every statement uses IF NOT EXISTS / DO-block guards so it is safe
-- on both fresh databases and existing production databases.

-- ============================================================
-- 1. Missing enum TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'BUSY', 'ON_BREAK', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DriverRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DriverRequestCategory" AS ENUM ('GENERAL', 'MEAL_PICKUP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. Missing enum VALUES on existing types
-- ============================================================

DO $$ BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DRIVER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LEADER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MAID';   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CHEF';   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. Missing columns on "User"
-- ============================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contactNumber"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "vehicleInfo"     TEXT;

-- driverStatus needs the enum type to exist first (created above)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'driverStatus'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "driverStatus" "DriverStatus" NOT NULL DEFAULT 'OFFLINE';
  END IF;
END $$;

-- ============================================================
-- 4. Missing table "DriverRequest"
-- ============================================================

CREATE TABLE IF NOT EXISTS "DriverRequest" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "category"        "DriverRequestCategory" NOT NULL DEFAULT 'GENERAL',
  "requestedDate"   TIMESTAMP(3) NOT NULL,
  "requestedTime"   TEXT NOT NULL,
  "destination"     TEXT NOT NULL,
  "purpose"         TEXT,
  "isRoundTrip"     BOOLEAN NOT NULL DEFAULT false,
  "returnDate"      TIMESTAMP(3),
  "returnTime"      TEXT,
  "returnLocation"  TEXT,
  "contactNumber"   TEXT,
  "status"          "DriverRequestStatus" NOT NULL DEFAULT 'PENDING',
  "driverId"        TEXT,
  "adminNote"       TEXT,
  "reviewedById"    TEXT,
  "reviewedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverRequest_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (safe: silently fails if they already exist)
DO $$ BEGIN
  ALTER TABLE "DriverRequest" ADD CONSTRAINT "DriverRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DriverRequest" ADD CONSTRAINT "DriverRequest_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DriverRequest" ADD CONSTRAINT "DriverRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "DriverRequest_userId_idx"   ON "DriverRequest"("userId");
CREATE INDEX IF NOT EXISTS "DriverRequest_status_idx"   ON "DriverRequest"("status");
CREATE INDEX IF NOT EXISTS "DriverRequest_driverId_idx" ON "DriverRequest"("driverId");

-- ============================================================
-- 5. Missing indexes on "DutySession"
-- ============================================================

CREATE INDEX IF NOT EXISTS "DutySession_userId_status_idx"       ON "DutySession"("userId", "status");
CREATE INDEX IF NOT EXISTS "DutySession_status_punchedOnAt_idx"  ON "DutySession"("status", "punchedOnAt");
