import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';
import { resolveMercadoPagoPayerEmail } from '../integrations/payment/payer-email.util';

async function main() {
  const amountCents = parseInt(process.argv[2] ?? '10', 10);
  const invoiceId = process.argv[3] ?? `test-${Date.now()}`;

  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred?.apiKey ?? '') || cred?.apiKey;
  if (!token) {
    console.error('No MP credential');
    process.exit(1);
  }

  const me = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = await me.json();
  const sandbox =
    profile.nickname?.startsWith('TESTUSER') ||
    String(profile.email ?? '').includes('@testuser.com');

  const amount = (amountCents / 100).toFixed(2);
  const payerEmailArg = process.argv[5];
  const email = resolveMercadoPagoPayerEmail(
    invoiceId,
    payerEmailArg ?? undefined,
    sandbox,
  );

  const body = {
    type: 'online',
    external_reference: invoiceId,
    total_amount: amount,
    payer: { email, ...(sandbox ? { first_name: 'APRO' } : {}) },
    transactions: {
      payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' } }],
    },
  };

  const idempotencyKey = process.argv[4] ?? `probe-${invoiceId}`;
  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log('sandbox', sandbox);
  console.log('amountCents', amountCents, 'amount', amount);
  console.log('idempotencyKey', idempotencyKey);
  console.log('payerEmail', email);
  console.log('status', response.status);
  console.log(text);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
