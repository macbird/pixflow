import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const tenantPasswords = [
  '12345678',
  'SenhaFinal123!',
  'Password123!',
  'Mudar123!',
  'test12345',
  'AdminPassword123!',
];

const adminPasswords = [
  'admin123',
  'AdminPassword123!',
  'Mudar123!',
];

async function tryPasswords(
  label: string,
  hash: string,
  passwords: string[],
): Promise<void> {
  console.log(`\n=== ${label} ===`);
  for (const pwd of passwords) {
    const ok = await argon2.verify(hash, pwd);
    console.log(ok ? '  OK ' : ' FAIL', pwd);
  }
}

async function main() {
  const user = await prisma.accountUser.findUnique({
    where: { email: 'test_final@example.com' },
  });
  if (user) {
    await tryPasswords('Tenant test_final@example.com', user.passwordHash, tenantPasswords);
  } else {
    console.log('Tenant user not found');
  }

  const admin = await prisma.platformAdmin.findUnique({
    where: { email: 'admin@iptvmanager.com' },
  });
  if (admin) {
    await tryPasswords('Admin admin@iptvmanager.com', admin.password, adminPasswords);
  } else {
    console.log('Admin not found');
  }
}

main().finally(() => prisma.$disconnect());
