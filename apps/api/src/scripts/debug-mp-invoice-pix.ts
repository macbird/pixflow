import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const invoiceId = process.argv[2] ?? '5859470a-74bf-4249-b5f9-fda8a89e95bc';
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, account: { include: { users: true } } },
  });
  if (!invoice) {
    console.error('invoice not found');
    return;
  }

  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { accountId: invoice.accountId, provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;

  const ownerEmail = invoice.account.users[0]?.email;
  const email =
    invoice.customer?.email?.trim() ||
    ownerEmail ||
    'test_user_8751396418337136189@testuser.com';
  const amount = (invoice.amountCents / 100).toFixed(2);

  console.log('email', email, 'amount', amount);

  const body = {
    type: 'online',
    external_reference: invoiceId,
    total_amount: amount,
    payer: { email },
    transactions: {
      payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' } }],
    },
  };

  for (const key of [invoiceId, `cm-${invoiceId}`, `cm-${invoiceId}-${Date.now()}`]) {
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    });
    console.log('\nkey', key, 'status', response.status);
    console.log(await response.text());
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
