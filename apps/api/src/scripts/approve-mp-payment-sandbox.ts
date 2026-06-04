import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

/**
 * Script to manually approve a payment in Mercado Pago Sandbox.
 * Note: This only works if the payment was created with a Test User or in Sandbox mode.
 */
async function main() {
  const paymentId = process.argv[2];

  if (!paymentId) {
    console.error('Usage: npx tsx apps/api/src/scripts/approve-mp-payment-sandbox.ts <paymentId>');
    process.exit(1);
  }

  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });

  if (!cred?.apiKey) {
    console.error('No active Mercado Pago credential found in database.');
    return;
  }

  const token = safeDecryptCredential(cred.apiKey) || cred.apiKey;

  console.log(`Attempting to approve payment ${paymentId} in Sandbox...`);

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'approved',
    }),
  });

  const text = await response.text();
  console.log('Status Code:', response.status);
  
  try {
    const data = JSON.parse(text);
    if (response.ok) {
      console.log('✅ Payment approved successfully!');
      console.log('Current Status:', data.status);
    } else {
      console.error('❌ Failed to approve payment:', data.message || text);
      if (data.message?.includes('status_invalid')) {
        console.log('Tip: Make sure the payment is "pending" and you are using a Test User / Sandbox credentials.');
      }
    }
  } catch {
    console.log('Raw response:', text);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
