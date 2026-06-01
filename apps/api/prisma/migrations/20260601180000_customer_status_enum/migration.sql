-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'trial', 'overdue', 'blocked', 'cancelled');

-- AlterTable: map legacy string values to enum
ALTER TABLE "customers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "customers" ALTER COLUMN "status" TYPE "CustomerStatus" USING (
  CASE
    WHEN "status" = 'inactive' THEN 'cancelled'::"CustomerStatus"
    WHEN "status" IN ('active', 'trial', 'overdue', 'blocked', 'cancelled') THEN "status"::"CustomerStatus"
    ELSE 'active'::"CustomerStatus"
  END
);
ALTER TABLE "customers" ALTER COLUMN "status" SET DEFAULT 'active'::"CustomerStatus";
