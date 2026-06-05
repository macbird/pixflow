/**
 * Provisions Evolution instances and persists WhatsApp config in the database.
 *
 * Usage:
 *   npm run setup:evolution -w apps/api
 *   npm run setup:evolution -w apps/api -- --slug=toro-tv --phone=35999516263
 *   npm run setup:evolution -w apps/api -- --qr-only --slug=toro-tv
 *
 * Requires: EVOLUTION_BASE_URL, EVOLUTION_API_KEY, DATABASE_URL
 * Evolution container running (docker compose up -d evolution-api)
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

import { PrismaClient } from '@prisma/client';
import { encryptCredential } from '../core/crypto/credential-crypto';
import { EvolutionAdminClient } from '../integrations/whatsapp/evolution-admin.client';
import {
  buildEvolutionInstanceUrl,
  parseEvolutionConnectionConfig,
} from '../integrations/whatsapp/evolution-config.util';

const prisma = new PrismaClient();

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. See apps/api/.env.example`);
  }
  return value;
}

async function main() {
  const baseUrl = requireEnv('EVOLUTION_BASE_URL').replace(/\/$/, '');
  const apiKey = requireEnv('EVOLUTION_API_KEY');
  const slugFilter = readArg('slug');
  const phoneOverride = readArg('phone');
  const qrOnly = hasFlag('qr-only');

  const evolution = new EvolutionAdminClient(baseUrl, apiKey);

  const accounts = await prisma.account.findMany({
    where: slugFilter ? { slug: slugFilter } : undefined,
    select: { id: true, name: true, slug: true, phone: true },
    orderBy: { name: 'asc' },
  });

  if (accounts.length === 0) {
    console.error(slugFilter ? `No account with slug "${slugFilter}"` : 'No accounts in database');
    process.exit(1);
  }

  console.log(`Evolution: ${baseUrl}`);
  console.log(`Accounts: ${accounts.length}\n`);

  for (const account of accounts) {
    const instanceName = account.slug;
    const instanceUrl = buildEvolutionInstanceUrl(baseUrl, instanceName);
    const encryptedKey = encryptCredential(apiKey);

    if (!qrOnly) {
      await evolution.ensureInstance({ instanceName, token: instanceName });
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

      if (phoneOverride) {
        await prisma.account.update({
          where: { id: account.id },
          data: { phone: phoneOverride },
        });
      }

      console.log(`[db] ${account.name} (${instanceName})`);
      console.log(`     tenant_whatsapp_config.instance_url = ${instanceUrl}`);
      console.log(`     tenant_whatsapp_config.api_key      = (encrypted)`);
      if (phoneOverride || account.phone) {
        console.log(`     accounts.phone                    = ${phoneOverride ?? account.phone}`);
      }
    }

    try {
      const connect = await evolution.getConnectInfo(instanceName);
      const state = await evolution.fetchConnectionState(instanceName).catch(() => connect.state);
      console.log(`[evo] ${instanceName} state=${state}`);
      if (connect.qrCodeBase64) {
        const preview = connect.qrCodeBase64.startsWith('data:')
          ? connect.qrCodeBase64
          : `data:image/png;base64,${connect.qrCodeBase64}`;
        console.log(`     QR (open in browser): ${preview.slice(0, 80)}...`);
        console.log(
          `     Manager: ${baseUrl}/manager  |  Connect API: GET /instance/connect/${instanceName}`,
        );
      }
      if (connect.pairingCode) {
        console.log(`     Pairing code: ${connect.pairingCode}`);
      }
    } catch (error) {
      console.warn(
        `[evo] ${instanceName} connect failed:`,
        error instanceof Error ? error.message : error,
      );
    }

    console.log('');
  }

  const sample = accounts[0];
  const parsed = parseEvolutionConnectionConfig(
    buildEvolutionInstanceUrl(baseUrl, sample.slug),
  );
  console.log('Done. Parsed for sendText:', parsed);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
