import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordResetRequired: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: { customers: true, plans: true, servers: true },
      },
    },
  });

  const platformAdmins = await prisma.platformAdmin.findMany({
    select: { id: true, email: true, createdAt: true },
  });

  console.log(JSON.stringify({ accounts, platformAdmins }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
