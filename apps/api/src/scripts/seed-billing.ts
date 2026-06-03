import { PrismaClient, type BillingInvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

function cycleKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function monthOffsets(count: number): { key: string }[] {
  const now = new Date();
  const items: { key: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    items.push({ key: cycleKey(d.getFullYear(), d.getMonth()) });
  }
  return items;
}

function dueDateForCycle(cycle: string, day: number) {
  const [y, m] = cycle.split('-').map(Number);
  return new Date(y, m - 1, Math.min(day, 28));
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

async function clearBillingData() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
}

async function createInvoiceWithPayment(params: {
  scope: 'platform' | 'tenant';
  accountId: string;
  customerId?: string;
  billingCycleKey: string;
  amountCents: number;
  dueDate: Date;
  status: BillingInvoiceStatus;
  pixPrefix: string;
  paymentSeq: number;
}) {
  const { status } = params;
  const invoice = await prisma.invoice.create({
    data: {
      scope: params.scope,
      accountId: params.accountId,
      customerId: params.customerId ?? null,
      billingCycleKey: params.billingCycleKey,
      amountCents: params.amountCents,
      dueDate: params.dueDate,
      status,
      paidAt: status === 'paid' ? params.dueDate : null,
      pixCopyPaste:
        status === 'canceled' ? null : `${params.pixPrefix}${params.billingCycleKey.replace('-', '')}`,
      providerChargeId:
        status === 'draft'
          ? null
          : `${params.scope}_${params.accountId.slice(0, 6)}_${params.customerId?.slice(0, 8) ?? 'saas'}_${params.billingCycleKey}`,
    },
  });

  if (status === 'paid') {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: params.amountCents,
        method: params.paymentSeq % 3 === 0 ? 'manual' : 'pix',
        providerPaymentId: `pay_${invoice.id.slice(0, 8)}_${params.billingCycleKey}`,
        paidAt: params.dueDate,
      },
    });
  }

  return invoice;
}

async function main() {
  console.log('Seeding billing (6 months + payments)...');
  await clearBillingData();

  let plan = await prisma.platformPlan.findFirst({ where: { isDefault: true } });
  if (!plan) {
    plan = await prisma.platformPlan.create({
      data: {
        name: 'Plano Padrão',
        priceCents: 4990,
        billingCycle: 'monthly',
        maxCustomers: 500,
        isDefault: true,
        active: true,
      },
    });
  }

  await prisma.platformPaymentConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      provider: 'asaas',
      apiKey: 'sandbox_platform_key_example',
      webhookToken: 'wh_platform_example',
      overdueDays: 7,
    },
    update: {},
  });

  await prisma.platformWhatsappConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      provider: 'evolution',
      instanceUrl: 'http://localhost:8080',
      apiKey: 'evolution_platform_example',
    },
    update: {},
  });

  const months = monthOffsets(6);
  const accounts = await prisma.account.findMany({
    include: { customers: { include: { plan: true } } },
  });

  let paymentSeq = 0;

  for (const account of accounts) {
    await prisma.accountSubscription.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        platformPlanId: plan.id,
        dueDay: 10,
        nextDueDate: dueDateForCycle(cycleKey(new Date().getFullYear(), new Date().getMonth()), 10),
        status: account.status === 'suspended' ? 'past_due' : 'active',
      },
      update: { platformPlanId: plan.id },
    });

    await prisma.tenantPaymentConfig.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        provider: 'asaas',
        apiKey: `sandbox_tenant_${account.slug}`,
        webhookToken: `wh_${account.slug}`,
      },
      update: {},
    });

    await prisma.tenantWhatsappConfig.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        provider: 'evolution',
        instanceUrl: `http://localhost:8080/${account.slug}`,
        apiKey: `evo_${account.slug}`,
      },
      update: {},
    });

    for (let mi = 0; mi < months.length; mi++) {
      const month = months[mi];
      const isLatest = mi === months.length - 1;
      const isPrev = mi === months.length - 2;

      let status: BillingInvoiceStatus = 'paid';
      if (isLatest) status = 'open';
      else if (isPrev) status = 'overdue';
      else if (mi === 0) status = 'paid';

      paymentSeq += 1;
      await createInvoiceWithPayment({
        scope: 'platform',
        accountId: account.id,
        billingCycleKey: month.key,
        amountCents: plan.priceCents,
        dueDate: dueDateForCycle(month.key, 10),
        status,
        pixPrefix: `SAAS${account.slug}`,
        paymentSeq,
      });
    }

    for (const customer of account.customers) {
      const amountCents = customer.plan
        ? Math.round(Number(customer.plan.price) * 100)
        : 3500 + (customer.name.length % 5) * 500;

      for (let mi = 0; mi < months.length; mi++) {
        const month = months[mi];
        const isLatest = mi === months.length - 1;
        const isPrev = mi === months.length - 2;

        let status: BillingInvoiceStatus = 'paid';
        if (isLatest) status = customer.id.charCodeAt(0) % 3 === 0 ? 'open' : 'paid';
        else if (isPrev) status = customer.id.charCodeAt(1) % 4 === 0 ? 'overdue' : 'paid';

        paymentSeq += 1;
        await createInvoiceWithPayment({
          scope: 'tenant',
          accountId: account.id,
          customerId: customer.id,
          billingCycleKey: month.key,
          amountCents,
          dueDate: dueDateForCycle(month.key, 15),
          status,
          pixPrefix: `CLI${customer.id.slice(0, 6)}`,
          paymentSeq,
        });
      }
    }
  }

  const [invoices, payments] = await Promise.all([
    prisma.invoice.count(),
    prisma.payment.count(),
  ]);

  console.log(
    `Done: ${accounts.length} accounts, ${months.length} cycles, ${invoices} invoices, ${payments} payments.`,
  );
  console.log('Months:', months.map((m) => `${m.key} (${monthLabel(m.key)})`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
