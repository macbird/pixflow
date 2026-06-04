import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId) {
    console.error('Usage: ts-node print-mp-ticket-url.ts <invoiceId>');
    process.exit(1);
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    console.error('Invoice not found');
    process.exit(1);
  }

  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred?.apiKey ?? '') || cred?.apiKey;
  if (!token) {
    console.error('Mercado Pago credential missing');
    process.exit(1);
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${invoiceId}&sort=date_created&criteria=desc`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const payload = await response.json();
  const latest = payload.results?.[0];

  console.log(
    JSON.stringify(
      {
        invoiceId,
        mpPaymentId: latest?.id,
        status: latest?.status,
        live_mode: latest?.live_mode,
        ticket_url: latest?.point_of_interaction?.transaction_data?.ticket_url ?? null,
        fallback_ticket: latest?.id
          ? `https://www.mercadopago.com.br/payments/${latest.id}/ticket`
          : null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
