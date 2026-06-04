import { prisma } from '../core/database';
import { safeDecryptCredential } from '../core/crypto/credential-crypto';
import { MercadoPagoPaymentProvider } from '../integrations/payment/mercadopago.provider';

async function main() {
  const cred = await prisma.tenantPaymentCredential.findFirst({
    where: { provider: 'mercadopago', active: true },
  });
  const token = safeDecryptCredential(cred!.apiKey!) || cred!.apiKey!;
  const provider = new MercadoPagoPaymentProvider(token);
  const result = await provider.createCharge({
    tenantId: 'test',
    invoiceId: '5859470a-74bf-4249-b5f9-fda8a89e95bc',
    amountCents: 4000,
    dueDate: new Date(),
    payerName: 'Marcinho',
    payerEmail: 'jpaulo_silva2005@yahoo.com.br',
  });
  console.log('ok', result.providerChargeId, result.copyPasteCode?.slice(0, 40));
}

main()
  .catch((error) => console.error('fail', error.message))
  .finally(() => prisma.$disconnect());
