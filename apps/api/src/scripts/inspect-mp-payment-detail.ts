import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const invoiceId = '5859470a-74bf-4249-b5f9-fda8a89e95bc';
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice!.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  const response = await fetch('https://api.mercadopago.com/v1/payments/161634662471', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payment = await response.json();

  console.log(
    JSON.stringify(
      {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        live_mode: payment.live_mode,
        transaction_amount: payment.transaction_amount,
        date_approved: payment.date_approved,
        date_of_expiration: payment.date_of_expiration,
        external_reference: payment.external_reference,
        payment_method_id: payment.payment_method_id,
        point_of_interaction: payment.point_of_interaction,
        order: payment.order,
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
