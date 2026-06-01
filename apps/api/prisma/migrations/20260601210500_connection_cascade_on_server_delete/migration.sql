-- DropForeignKey
ALTER TABLE "connections" DROP CONSTRAINT "connections_serverId_fkey";

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
