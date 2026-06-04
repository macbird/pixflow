import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function probe(url: string, token: string, label: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  console.log(`\n=== ${label} ===`);
  console.log('GET', url);
  console.log('status', response.status);
  console.log(text.slice(0, 1500));
}

async function main() {
  const invoiceId = process.argv[2] ?? '5859470a-74bf-4249-b5f9-fda8a89e95bc';
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice!.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  await probe(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${invoiceId}&sort=date_created&criteria=desc`,
    token,
    'payments search',
  );

  await probe(
    `https://api.mercadopago.com/v1/payments/161634662471`,
    token,
    'payment by id',
  );

  if (invoice?.providerChargeId) {
    await probe(
      `https://api.mercadopago.com/v1/payments/${invoice.providerChargeId}`,
      token,
      'payment by PAY id',
    );
  }

  // Try merchant orders / orders endpoints
  await probe(
    `https://api.mercadopago.com/merchant_orders/search?external_reference=${invoiceId}`,
    token,
    'merchant_orders search',
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
