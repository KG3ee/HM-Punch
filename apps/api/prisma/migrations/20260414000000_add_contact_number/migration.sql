-- AlterTable: add optional contactNumber to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contactNumber" TEXT;
