import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';
import { PaymentGenerationService } from '../integrations/payment/payment-generation.service';

async function main() {
  const invoiceId = process.argv[2] ?? '5859470a-74bf-4249-b5f9-fda8a89e95bc';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      pixCopyPaste: null,
      pixQrCodeBase64: null,
      providerChargeId: null,
      paymentProvider: null,
    },
  });

  const generation = new PaymentGenerationService();
  const invoice = await generation.generatePayment(invoiceId);

  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${invoiceId}&sort=date_created&criteria=desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  const latest = payload.results?.[0];

  let ticketUrl = latest?.point_of_interaction?.transaction_data?.ticket_url ?? null;
  const liveMode = latest?.live_mode;

  console.log(
    JSON.stringify(
      {
        invoiceId: invoice.id,
        providerChargeId: invoice.providerChargeId,
        mpPaymentId: latest?.id,
        status: latest?.status,
        live_mode: liveMode,
        ticket_url: ticketUrl,
        ticket_url_hint: liveMode
          ? `https://www.mercadopago.com.br/payments/${latest?.id}/ticket`
          : ticketUrl,
        expires: latest?.date_of_expiration,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
