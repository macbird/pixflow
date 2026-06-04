import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';

async function main() {
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });
  if (!cred?.apiKey) return;

  const token = safeDecryptCredential(cred.apiKey) || cred.apiKey;

  for (const url of [
    'https://api.mercadopago.com/users/me',
    'https://api.mercadopago.com/v1/payment_methods',
  ]) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await response.text();
    console.log('\nURL', url);
    console.log('status', response.status);
    console.log('body', text.slice(0, 500));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
