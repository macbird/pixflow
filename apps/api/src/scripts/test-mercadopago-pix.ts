import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';
import { resolveMercadoPagoPayerEmail } from '../integrations/payment/payer-email.util';

async function main() {
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });
  if (!cred?.apiKey) {
    console.error('No mercadopago credential');
    return;
  }

  const token = safeDecryptCredential(cred.apiKey) || cred.apiKey;
  const invoiceId = '421e11f1-176c-42a4-a17f-573e60e58bbf';
  const email = process.argv[2] ?? 'test_user_8751396418337136189@testuser.com';

  const body = {
    transaction_amount: 35,
    payment_method_id: 'pix',
    description: 'Test PIX charge',
    external_reference: invoiceId,
    payer: {
      email,
      first_name: 'Marcinho',
      last_name: 'Cliente',
      identification: { type: 'CPF', number: '11111111111' },
    },
  };

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': `test-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log('status', response.status);
  console.log('body', text);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
