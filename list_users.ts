import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.accountUser.findMany({
      select: { email: true, name: true, account: { select: { slug: true, status: true } } }
    });
    console.log("=== Account Users ===");
    console.table(users);

    const admins = await prisma.platformAdmin.findMany({
      select: { email: true, name: true }
    });
    console.log("=== Platform Admins ===");
    console.table(admins);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
