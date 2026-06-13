import { Prisma } from '@prisma/client';
import { API_ERROR_CODES, ApiBusinessError } from '@client-manager/shared';
import { prisma } from '../../core/database';
import argon2 from 'argon2';
import {
  advanceNextDueDate,
  billingCycleKeyFromDate,
  dueDayFromDate,
  parseDueDateInput,
  defaultNextDueDate,
} from '../billing/account-billing.util';
import { InvoicesService } from '../billing/invoices.service';
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

function mapAccount(
  account: {
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
  },
  paymentConfigured = false,
) {
  return {
    id: account.id,
    name: account.name,
    slug: account.slug,
    phone: account.phone,
    status: account.status as 'active' | 'inactive',
    paymentConfigured,
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

async function resolvePlatformPlanId(
  tx: Pick<typeof prisma, 'platformPlan'>,
  platformPlanId?: string,
) {
  if (!platformPlanId) {
    return resolveDefaultPlatformPlanId(tx);
  }

  const plan = await tx.platformPlan.findFirst({
    where: { id: platformPlanId, active: true },
  });
  if (!plan) {
    throw new ApiBusinessError(
      'Plano SaaS não encontrado ou inativo',
      API_ERROR_CODES.NOT_FOUND,
      404,
    );
  }
  return plan.id;
}

export class TenantsService {
  async list(page: number, pageSize: number, filter: string, statusFilter?: string) {
    const skip = (page - 1) * pageSize;
    const trimmed = filter.trim();
    const where = {
      ...(statusFilter === 'active' || statusFilter === 'inactive'
        ? { status: statusFilter as 'active' | 'inactive' }
        : {}),
      ...(trimmed
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
        : {}),
    };

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

    const accountIds = rows.map((row) => row.id);
    const credentials =
      accountIds.length === 0
        ? []
        : await prisma.tenantPaymentCredential.findMany({
            where: { accountId: { in: accountIds }, active: true },
            select: { accountId: true, apiKey: true },
          });
    const paymentConfiguredIds = new Set(
      credentials.filter((row) => Boolean(row.apiKey)).map((row) => row.accountId),
    );

    return {
      data: rows.map((row) => mapAccount(row, paymentConfiguredIds.has(row.id))),
      total,
    };
  }

  async findById(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: accountListInclude,
    });
    if (!account) return null;

    const credential = await prisma.tenantPaymentCredential.findFirst({
      where: { accountId: id, active: true, apiKey: { not: null } },
      select: { id: true },
    });

    return mapAccount(account, Boolean(credential));
  }

  async create(input: {
    name: string;
    slug: string;
    ownerEmail: string;
    ownerName: string;
    initialPassword?: string;
    dueDate: string;
    platformPlanId?: string;
    phone?: string;
  }) {
    const slug = input.slug;
    const initialPassword = input.initialPassword || 'Mudar123!';
    const passwordHash = await argon2.hash(initialPassword);
    const nextDueDate = parseDueDateInput(input.dueDate);
    const dueDay = dueDayFromDate(nextDueDate);

    try {
      return await prisma.$transaction(async (tx) => {
      const platformPlanId = await resolvePlatformPlanId(tx, input.platformPlanId);

      const account = await tx.account.create({
        data: {
          name: input.name,
          slug,
          status: 'active',
          phone: input.phone?.trim() || null,
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ApiBusinessError(
          'Este identificador da conta já está em uso. Escolha outro.',
          API_ERROR_CODES.CONFLICT,
          409,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: { status?: 'active' | 'inactive'; dueDate?: string; platformPlanId?: string; phone?: string | null },
  ) {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      throw new ApiBusinessError('Conta não encontrada', API_ERROR_CODES.NOT_FOUND, 404);
    }

    if (input.status !== undefined) {
      await prisma.account.update({
        where: { id },
        data: { status: input.status },
      });
    }

    if (input.phone !== undefined) {
      await prisma.account.update({
        where: { id },
        data: { phone: input.phone?.trim() || null },
      });
    }

    if (input.dueDate !== undefined || input.platformPlanId !== undefined) {
      const subscription = await prisma.accountSubscription.findUnique({
        where: { accountId: id },
      });
      const nextDueDate =
        input.dueDate !== undefined
          ? parseDueDateInput(input.dueDate)
          : subscription?.nextDueDate ?? defaultNextDueDate();
      const dueDay = dueDayFromDate(nextDueDate);
      const platformPlanId =
        input.platformPlanId !== undefined
          ? await resolvePlatformPlanId(prisma, input.platformPlanId)
          : subscription
            ? subscription.platformPlanId
            : await resolveDefaultPlatformPlanId(prisma);

      await prisma.accountSubscription.upsert({
        where: { accountId: id },
        create: {
          accountId: id,
          platformPlanId,
          dueDay,
          nextDueDate,
          status: input.status === 'inactive' ? 'past_due' : 'active',
        },
        update: {
          platformPlanId,
          dueDay,
          nextDueDate,
        },
      });
    }

    return this.findById(id);
  }

  async toggleStatus(id: string, status: 'active' | 'inactive') {
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
      throw new ApiBusinessError('Conta não encontrada', API_ERROR_CODES.NOT_FOUND, 404);
    }

    if (!account.subscription) {
      throw new ApiBusinessError(
        'Conta sem assinatura SaaS configurada',
        API_ERROR_CODES.NOT_ALLOWED,
        400,
      );
    }

    const { subscription } = account;
    const dueDate = subscription.nextDueDate;
    const billingCycleKey = billingCycleKeyFromDate(dueDate);

    const invoice = await invoicesService.createPlatformFromSubscription({
      accountId,
      amountCents: subscription.platformPlan.priceCents,
      dueDate,
      billingCycleKey,
    });

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
      throw new ApiBusinessError('Usuário não encontrado', API_ERROR_CODES.NOT_FOUND, 404);
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
