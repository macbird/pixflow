import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  const methods = await fetch('https://api.mercadopago.com/v1/payment_methods', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json() as Promise<Array<{ id: string; status: string }>>);

  const pix = methods.find((m) => m.id === 'pix');
  console.log('pix method', pix);

  const ordersBody = {
    type: 'online',
    external_reference: 'test-order-1',
    total_amount: '35.00',
    payer: { email: 'test_user_8751396418337136189@testuser.com' },
    transactions: {
      payments: [
        {
          amount: '35.00',
          payment_method: { id: 'pix', type: 'bank_transfer' },
        },
      ],
    },
  };

  const ordersRes = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': `order-${Date.now()}`,
    },
    body: JSON.stringify(ordersBody),
  });
  console.log('orders status', ordersRes.status);
  const ordersText = await ordersRes.text();
  console.log('orders body', ordersText);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
