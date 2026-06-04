import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function probe(url: string, token: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  console.log('\nGET', url);
  console.log('status', response.status);
  console.log(text.slice(0, 800));
}

async function main() {
  const invoiceId = '5859470a-74bf-4249-b5f9-fda8a89e95bc';
  const paymentId = 'PAY01KT8DYNFYNX5E8KSQYT6VXD1Z';

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice!.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  await probe(`https://api.mercadopago.com/v1/payments/${paymentId}`, token);
  await probe(`https://api.mercadopago.com/v1/orders/${paymentId}`, token);
  await probe(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${invoiceId}`,
    token,
  );
  await probe(
    `https://api.mercadopago.com/v1/orders/search?external_reference=${invoiceId}`,
    token,
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
