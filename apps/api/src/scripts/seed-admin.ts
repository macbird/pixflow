import { prisma } from '../core/database';
import argon2 from 'argon2';

async function seedAdmin() {
  const email = 'admin@iptvmanager.com';
  const password = 'AdminPassword123!';
  const hashedPassword = await argon2.hash(password);

  await prisma.platformAdmin.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      email,
      password: hashedPassword,
    },
  });

  console.log('Admin seeded successfully');
}

seedAdmin().finally(() => prisma.$disconnect());
