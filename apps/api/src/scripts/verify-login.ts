import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const tenantEmail = process.argv[2] ?? 'test_final@example.com';
const tenantPassword = process.argv[3] ?? '12345678';
const adminEmail = process.argv[4] ?? 'admin@iptvmanager.com';
const adminPassword = process.argv[5] ?? 'admin123';

async function main() {
  const user = await prisma.accountUser.findUnique({ where: { email: tenantEmail } });
  if (!user) {
    console.log('TENANT: user not found', tenantEmail);
  } else {
    const ok = await argon2.verify(user.passwordHash, tenantPassword);
    console.log('TENANT:', tenantEmail, ok ? 'PASSWORD_OK' : 'PASSWORD_FAIL', {
      passwordResetRequired: user.passwordResetRequired,
    });
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    console.log('ADMIN: not found', adminEmail);
  } else {
    const ok = await argon2.verify(admin.password, adminPassword);
    console.log('ADMIN:', adminEmail, ok ? 'PASSWORD_OK' : 'PASSWORD_FAIL');
  }
}

main().finally(() => prisma.$disconnect());
