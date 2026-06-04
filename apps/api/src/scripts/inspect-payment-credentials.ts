import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const rows = await prisma.tenantPaymentCredential.findMany({
    select: {
      accountId: true,
      provider: true,
      active: true,
      apiKey: true,
      account: { select: { name: true } },
    },
  });

  for (const row of rows) {
    const raw = row.apiKey ?? '';
    const resolved = safeDecryptCredential(raw) || raw;
    const preview = resolved ? `${resolved.slice(0, 16)}...` : '(empty)';
    console.log(
      JSON.stringify({
        tenant: row.account.name,
        provider: row.provider,
        active: row.active,
        keyPreview: preview,
        keyLength: resolved.length,
        looksLikePublicKey:
          resolved.startsWith('APP_USR-') && !resolved.startsWith('TEST-'),
      }),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
