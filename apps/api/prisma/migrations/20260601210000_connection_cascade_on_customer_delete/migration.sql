-- DropForeignKey
ALTER TABLE "connections" DROP CONSTRAINT "connections_customerId_fkey";

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
