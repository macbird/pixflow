import { prisma } from '../core/database';
import { PaymentGenerationService } from '../integrations/payment/payment-generation.service';

async function main() {
  const invoiceId =
    process.argv[2] ??
    (
      await prisma.invoice.findFirst({
        where: { amountCents: 10, status: { in: ['open', 'overdue', 'draft'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
    )?.id;

  if (!invoiceId) {
    console.error('Usage: ts-node repro-mp-generate-pix-error.ts <invoiceId>');
    process.exit(1);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, accountId: true, amountCents: true, pixCopyPaste: true, providerChargeId: true },
  });
  console.log('before', invoice);

  const service = new PaymentGenerationService();
  try {
    const result = await service.generatePayment(invoiceId, invoice?.accountId);
    console.log('ok', {
      id: result.id,
      providerChargeId: result.providerChargeId,
      hasPix: Boolean(result.pixCopyPaste),
    });
  } catch (error) {
    console.error('failed', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
