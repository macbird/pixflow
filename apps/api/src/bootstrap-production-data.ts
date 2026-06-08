import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './core/database';

/**
 * Imports production seed data on first boot when database is empty.
 */
export async function bootstrapProductionDataIfEmpty(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const [users, admins] = await Promise.all([
    prisma.accountUser.count(),
    prisma.platformAdmin.count(),
  ]);

  if (users > 0 || admins > 0) {
    console.log(`[bootstrap] skip import (users=${users}, admins=${admins})`);
    return;
  }

  const sqlPath = path.join(process.cwd(), 'scripts', 'bootstrap-data.sql');
  if (!fs.existsSync(sqlPath)) {
    console.warn('[bootstrap] SQL file missing, skipping import');
    return;
  }

  const statements = fs
    .readFileSync(sqlPath, 'utf8')
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.startsWith('INSERT INTO'));

  console.log(`[bootstrap] importing ${statements.length} INSERT statements...`);
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  const usersAfter = await prisma.accountUser.count();
  const adminsAfter = await prisma.platformAdmin.count();
  console.log(`[bootstrap] done (users=${usersAfter}, admins=${adminsAfter})`);
}
