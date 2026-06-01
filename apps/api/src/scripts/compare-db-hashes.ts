import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

async function main() {
  const urls = {
    client_manager:
      'postgresql://postgres:password@localhost:5433/client_manager?schema=public',
    iptv_manager:
      'postgresql://postgres:password@localhost:5433/iptv_manager?schema=public',
  };

  for (const [name, url] of Object.entries(urls)) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    const user = await prisma.accountUser.findUnique({
      where: { email: 'test_final@example.com' },
    });
    const admin = await prisma.platformAdmin.findUnique({
      where: { email: 'admin@iptvmanager.com' },
    });
    const pwd = 'SenhaFinal123!';
    console.log(
      name,
      'tenant hash prefix:',
      user?.passwordHash?.slice(0, 30),
      user ? await argon2.verify(user.passwordHash, pwd) : 'no user',
    );
    console.log(
      name,
      'admin hash prefix:',
      admin?.password?.slice(0, 30),
      admin ? await argon2.verify(admin.password, 'admin123') : 'no admin',
    );
    await prisma.$disconnect();
  }
}

main();
