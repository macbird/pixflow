import { prisma } from '../core/database';

async function main() {
  const invoiceId = '5859470a-74bf-4249-b5f9-fda8a89e95bc';

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
      connectionRenewalTasks: true,
      customer: {
        include: { _count: { select: { connections: true } } },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        id: invoice?.id,
        status: invoice?.status,
        paidAt: invoice?.paidAt,
        paymentsCount: invoice?.payments.length,
        activationsCount: invoice?.connectionRenewalTasks.length,
        customerConnections: invoice?.customer?._count.connections,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
