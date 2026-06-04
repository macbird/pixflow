import { prisma } from '../core/database';

async function main() {
  const pixFragment = process.argv[2] ?? 'mpqrinter161634662471';

  const invoice = await prisma.invoice.findFirst({
    where: { pixCopyPaste: { contains: pixFragment } },
    select: {
      id: true,
      status: true,
      amountCents: true,
      providerChargeId: true,
      pixCopyPaste: true,
      account: { select: { slug: true, name: true } },
      customer: { select: { id: true, name: true } },
      payments: { select: { id: true, method: true, source: true } },
    },
  });

  console.log(JSON.stringify(invoice, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
