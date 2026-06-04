import { prisma } from '../core/database';

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { amountCents: 10 },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { email: true, name: true } },
      account: { include: { users: { select: { email: true }, take: 1 } } },
    },
  });
  console.log(JSON.stringify(invoice, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
