/**
 * Links an existing Evolution instance to tenant_whatsapp_config in the database.
 *
 * Usage:
 *   npm run link:evolution -w apps/api -- --instance=torotv
 *   npm run link:evolution -w apps/api -- --instance=567a6b0a-ae0d-4c5c-88a6-78fade510363 --slug=toro-tv --phone=35999516263
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

import { PrismaClient } from '@prisma/client';
import { encryptCredential } from '../core/crypto/credential-crypto';
import { buildEvolutionInstanceUrl } from '../integrations/whatsapp/evolution-config.util';

const prisma = new PrismaClient();

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit?.slice(prefix.length);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const instanceName = readArg('instance');
  const slug = readArg('slug');
  const phone = readArg('phone');

  if (!instanceName) {
    throw new Error('Use --instance=torotv (Evolution instance name from Manager/API)');
  }

  const baseUrl = requireEnv('EVOLUTION_BASE_URL').replace(/\/$/, '');
  const apiKey = requireEnv('EVOLUTION_API_KEY');
  const instanceUrl = buildEvolutionInstanceUrl(baseUrl, instanceName);
  const encryptedKey = encryptCredential(apiKey);

  const account = slug
    ? await prisma.account.findUnique({ where: { slug } })
    : await prisma.account.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!account) {
    throw new Error(slug ? `Account slug not found: ${slug}` : 'No account in database');
  }

  await prisma.tenantWhatsappConfig.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      provider: 'evolution',
      instanceUrl,
      apiKey: encryptedKey,
    },
    update: {
      provider: 'evolution',
      instanceUrl,
      apiKey: encryptedKey,
    },
  });

  if (phone) {
    await prisma.account.update({ where: { id: account.id }, data: { phone } });
  }

  console.log('Linked Evolution instance to tenant:');
  console.log(`  account:      ${account.name} (${account.slug})`);
  console.log(`  instance:     ${instanceName}`);
  console.log(`  instance_url: ${instanceUrl}`);
  console.log(`  phone:        ${phone ?? account.phone ?? '(set accounts.phone for payment alerts)'}`);
  console.log('');
  console.log('Next: open Manager dashboard → Connect → scan QR until status is open.');
  console.log(`  ${baseUrl}/manager/instance/${instanceName}/dashboard`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
