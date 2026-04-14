-- AlterTable
ALTER TABLE "DutySession" ADD COLUMN "mood" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "reactionPalette" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
