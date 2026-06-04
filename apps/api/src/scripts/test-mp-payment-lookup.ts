import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';
import { fetchMercadoPagoPayment } from '../integrations/payment/mercadopago-payment.client';

async function main() {
  const paymentId = process.argv[2] ?? 'PAY01KT8DYNFYNX5E8KSQYT6VXD1Z';

  const credential = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });

  if (!credential?.apiKey) {
    console.error('No MP credential');
    process.exit(1);
  }

  const token = safeDecryptCredential(credential.apiKey) || credential.apiKey;
  const payment = await fetchMercadoPagoPayment(token, paymentId);
  console.log(JSON.stringify(payment, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
