import { prisma } from '../core/database';

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { providerChargeId: { not: null } },
    select: {
      id: true,
      providerChargeId: true,
      status: true,
      account: { select: { slug: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(JSON.stringify(invoice, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
