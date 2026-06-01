import { PrismaClient } from '@prisma/client';

async function probe(label: string, url: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const db = await prisma.$queryRaw<{ current_database: string }[]>`
      SELECT current_database();
    `;
    const users = await prisma.accountUser.findMany({
      select: { email: true },
      take: 5,
    });
    const admins = await prisma.platformAdmin.findMany({
      select: { email: true },
      take: 3,
    });
    console.log(`\n${label}: ${db[0]?.current_database}`);
    console.log('  users:', users.map((u) => u.email).join(', ') || '(none)');
    console.log('  admins:', admins.map((a) => a.email).join(', ') || '(none)');
  } catch (e) {
    console.log(`\n${label}: ERROR`, (e as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await probe(
    'client_manager:5433',
    'postgresql://postgres:password@localhost:5433/client_manager?schema=public',
  );
  await probe(
    'iptv_manager:5433',
    'postgresql://postgres:password@localhost:5433/iptv_manager?schema=public',
  );
  await probe(
    'iptv_manager:5432',
    'postgresql://postgres:password@localhost:5432/iptv_manager?schema=public',
  );
}

main();
