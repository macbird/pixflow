import { prisma } from '../core/database';

const invoiceId = process.argv[2];

if (!invoiceId) {
  console.error('Usage: ts-node clear-invoice-pix.ts <invoiceId>');
  process.exit(1);
}

async function main() {
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      pixCopyPaste: null,
      pixQrCodeBase64: null,
      paymentProvider: null,
      providerChargeId: null,
    },
  });

  console.log(
    JSON.stringify(
      {
        id: updated.id,
        status: updated.status,
        pixCopyPaste: updated.pixCopyPaste,
        providerChargeId: updated.providerChargeId,
        paymentProvider: updated.paymentProvider,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
