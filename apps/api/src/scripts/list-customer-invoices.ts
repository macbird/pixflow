import { prisma } from '../core/database';

async function main() {
  const customerId = process.argv[2];
  if (!customerId) {
    console.error('Usage: ts-node list-customer-invoices.ts <customerId>');
    process.exit(1);
  }

  const rows = await prisma.invoice.findMany({
    where: { customerId, status: { not: 'canceled' } },
    select: {
      id: true,
      amountCents: true,
      billingCycleKey: true,
      status: true,
      dueDate: true,
      pixCopyPaste: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
