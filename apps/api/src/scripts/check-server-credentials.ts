import { prisma } from '../core/database';

async function main() {
  const servers = await prisma.server.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      panelUsername: true,
      panelPasswordEncrypted: true,
    },
  });
  console.log(JSON.stringify(servers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
