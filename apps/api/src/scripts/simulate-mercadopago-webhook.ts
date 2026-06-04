import { prisma } from '../core/database';
import { buildMercadoPagoWebhookUrl } from '../modules/billing/payment-webhook.util';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const invoiceId = process.argv[2];
  const paymentId = process.argv[3];

  if (!invoiceId || !paymentId) {
    console.error('Usage: ts-node simulate-mercadopago-webhook.ts <invoiceId> <paymentId>');
    process.exit(1);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { account: { select: { slug: true, id: true } } },
  });

  if (!invoice?.account) {
    console.error('Invoice not found');
    process.exit(1);
  }

  const credential = await prisma.tenantPaymentCredential.findUnique({
    where: {
      accountId_provider: { accountId: invoice.account.id, provider: 'mercadopago' },
    },
  });

  const webhookToken = credential?.webhookToken
    ? safeDecryptCredential(credential.webhookToken) || credential.webhookToken
    : undefined;

  const url = buildMercadoPagoWebhookUrl(invoice.account.slug, { webhookToken });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'payment',
      action: 'payment.updated',
      data: { id: paymentId },
    }),
  });

  console.log('POST', url);
  console.log('status', response.status);
  console.log(await response.text());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
