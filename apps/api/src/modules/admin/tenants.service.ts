import { prisma } from '../../core/database';
import argon2 from 'argon2';
import slugify from 'slugify';
import {
  advanceNextDueDate,
  billingCycleKeyFromDate,
  dueDayFromDate,
  parseDueDateInput,
  defaultNextDueDate,
} from '../billing/account-billing.util';
import { InvoicesService } from '../billing/invoices.service';
import { InvoiceActionError } from '../billing/invoice-errors';

const accountListInclude = {
  users: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordResetRequired: true,
    },
  },
  subscription: {
    include: {
      platformPlan: {
        select: {
          id: true,
          name: true,
          priceCents: true,
        },
      },
    },
  },
} as const;

const invoicesService = new InvoicesService();

function mapSubscription(
  subscription: {
    dueDay: number;
    nextDueDate: Date;
    status: string;
    platformPlan: { id: string; name: string; priceCents: number };
  } | null,
) {
  if (!subscription) return null;
  return {
    dueDay: subscription.dueDay,
    nextDueDate: subscription.nextDueDate.toISOString(),
    status: subscription.status as 'active' | 'past_due' | 'canceled',
    platformPlan: subscription.platformPlan,
  };
}

function mapAccount(account: {
  id: string;
  name: string;
  slug: string;
  status: string;
  phone: string | null;
  planSaas: string | null;
  createdAt: Date;
  updatedAt: Date;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    passwordResetRequired: boolean;
  }>;
  subscription: Parameters<typeof mapSubscription>[0];
}) {
  return {
    id: account.id,
    name: account.name,
    slug: account.slug,
    status: account.status as 'active' | 'suspended',
    users: account.users,
    subscription: mapSubscription(account.subscription),
  };
}

async function resolveDefaultPlatformPlanId(tx: Pick<typeof prisma, 'platformPlan'>) {
  const plan = await tx.platformPlan.findFirst({
    where: { isDefault: true, active: true },
  });
  if (plan) return plan.id;

  const created = await tx.platformPlan.create({
    data: {
      name: 'Padrão',
      priceCents: 4990,
      isDefault: true,
      active: true,
    },
  });
  return created.id;
}

export class TenantsService {
  async list(page: number, pageSize: number, filter: string) {
    const skip = (page - 1) * pageSize;
    const trimmed = filter.trim();
    const where = trimmed
      ? {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' as const } },
            { slug: { contains: trimmed, mode: 'insensitive' as const } },
            {
              users: {
                some: {
                  OR: [
                    { name: { contains: trimmed, mode: 'insensitive' as const } },
                    { email: { contains: trimmed, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: accountListInclude,
      }),
      prisma.account.count({ where }),
    ]);

    return { data: rows.map(mapAccount), total };
  }

  async findById(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: accountListInclude,
    });
    return account ? mapAccount(account) : null;
  }

  async create(input: {
    name: string;
    slug?: string;
    ownerEmail: string;
    ownerName: string;
    initialPassword?: string;
    dueDate: string;
  }) {
    const slug = input.slug || slugify(input.name, { lower: true, strict: true });
    const initialPassword = input.initialPassword || 'Mudar123!';
    const passwordHash = await argon2.hash(initialPassword);
    const nextDueDate = parseDueDateInput(input.dueDate);
    const dueDay = dueDayFromDate(nextDueDate);

    return await prisma.$transaction(async (tx) => {
      const platformPlanId = await resolveDefaultPlatformPlanId(tx);

      const account = await tx.account.create({
        data: {
          name: input.name,
          slug,
          status: 'active',
        },
      });

      await tx.accountUser.create({
        data: {
          accountId: account.id,
          email: input.ownerEmail,
          name: input.ownerName,
          passwordHash,
          role: 'tenant_owner',
          passwordResetRequired: true,
        },
      });

      await tx.accountSubscription.create({
        data: {
          accountId: account.id,
          platformPlanId,
          dueDay,
          nextDueDate,
          status: 'active',
        },
      });

      const full = await tx.account.findUnique({
        where: { id: account.id },
        include: accountListInclude,
      });

      return mapAccount(full!);
    });
  }

  async update(
    id: string,
    input: { status?: 'active' | 'suspended'; dueDate?: string },
  ) {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      throw new Error('Account not found');
    }

    if (input.status !== undefined) {
      await prisma.account.update({
        where: { id },
        data: { status: input.status },
      });
    }

    if (input.dueDate !== undefined) {
      const nextDueDate = parseDueDateInput(input.dueDate);
      const dueDay = dueDayFromDate(nextDueDate);
      const platformPlanId = await resolveDefaultPlatformPlanId(prisma);

      await prisma.accountSubscription.upsert({
        where: { accountId: id },
        create: {
          accountId: id,
          platformPlanId,
          dueDay,
          nextDueDate,
          status: input.status === 'suspended' ? 'past_due' : 'active',
        },
        update: {
          dueDay,
          nextDueDate,
        },
      });
    }

    return this.findById(id);
  }

  async toggleStatus(id: string, status: 'active' | 'suspended') {
    return this.update(id, { status });
  }

  async generatePlatformInvoice(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        subscription: {
          include: { platformPlan: true },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.subscription) {
      throw new Error('Conta sem assinatura SaaS configurada');
    }

    const { subscription } = account;
    const dueDate = subscription.nextDueDate;
    const billingCycleKey = billingCycleKeyFromDate(dueDate);

    let invoice;
    try {
      invoice = await invoicesService.createPlatformFromSubscription({
        accountId,
        amountCents: subscription.platformPlan.priceCents,
        dueDate,
        billingCycleKey,
      });
    } catch (error) {
      if (error instanceof InvoiceActionError) {
        throw new Error(error.message);
      }
      throw error;
    }

    const nextDueDate = advanceNextDueDate(dueDate);
    await prisma.accountSubscription.update({
      where: { accountId },
      data: {
        nextDueDate,
        dueDay: dueDayFromDate(nextDueDate),
      },
    });

    return invoice;
  }

  async resetPassword(email: string, newPassword?: string) {
    const password = newPassword || 'Reset123!';
    const passwordHash = await argon2.hash(password);

    const user = await prisma.accountUser.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return await prisma.accountUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetRequired: true,
      },
    });
  }
}
