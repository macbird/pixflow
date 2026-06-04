import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const invoiceId = '5859470a-74bf-4249-b5f9-fda8a89e95bc';
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice!.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${invoiceId}&sort=date_created&criteria=desc`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const payload = await response.json();
  const results = (payload as { results?: Array<Record<string, unknown>> }).results ?? [];

  for (const item of results) {
    console.log(
      JSON.stringify(
        {
          id: item.id,
          status: item.status,
          transaction_amount: item.transaction_amount,
          external_reference: item.external_reference,
          date_approved: item.date_approved,
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
