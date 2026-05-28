import { prisma } from './core/database';

async function checkUser() {
  const user = await prisma.accountUser.findUnique({
    where: { email: 'test_final@example.com' },
  });
  console.log('User found:', user);
}

checkUser().finally(() => prisma.$disconnect());
