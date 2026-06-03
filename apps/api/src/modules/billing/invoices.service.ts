import { prisma } from '../../core/database';
import type { BillingScope, BillingInvoiceStatus, PaymentProviderType } from '@prisma/client';
import { InvoiceActionError } from './invoice-errors';
import { PaymentRouterService } from '../../integrations/payment/payment-router.service';
import { PaymentConfirmationService } from './payment-confirmation.service';

const CANCELABLE_STATUSES: BillingInvoiceStatus[] = ['draft', 'open', 'overdue'];
const paymentRouter = new PaymentRouterService();
const paymentConfirmation = new PaymentConfirmationService();

export class InvoicesService {
  private invoiceWhere(scope: BillingScope, accountId: string | null, invoiceId: string) {
    return {
      id: invoiceId,
      scope,
      ...(accountId ? { accountId } : {}),
    };
  }

  private mapDetail(row: {
    id: string;
    scope: BillingScope;
    billingCycleKey: string;
    amountCents: number;
    dueDate: Date;
    status: BillingInvoiceStatus;
    pixCopyPaste: string | null;
    paidAt: Date | null;
    paymentProvider: PaymentProviderType | null;
    providerChargeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    canceledAt: Date | null;
    cancelReason: string | null;
    replacesInvoiceId: string | null;
    account: { id: string; name: string };
    customer: { id: string; name: string } | null;
    payments: Array<{
      id: string;
      amountCents: number;
      method: string;
      paidAt: Date;
      providerPaymentId: string | null;
    }>;
    replacesInvoice: { id: string; status: BillingInvoiceStatus } | null;
    replacement: { id: string; status: BillingInvoiceStatus; amountCents: number } | null;
  }) {
    const canCancel =
      CANCELABLE_STATUSES.includes(row.status) && row.payments.length === 0;
    const canRecreate = row.status === 'canceled' && row.replacement === null;

    return {
      id: row.id,
      scope: row.scope,
      billingCycleKey: row.billingCycleKey,
      amountCents: row.amountCents,
      dueDate: row.dueDate.toISOString(),
      status: row.status,
      pixCopyPaste: row.pixCopyPaste,
      paidAt: row.paidAt?.toISOString() ?? null,
      paymentProvider: row.paymentProvider,
      providerChargeId: row.providerChargeId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      canceledAt: row.canceledAt?.toISOString() ?? null,
      cancelReason: row.cancelReason,
      replacesInvoiceId: row.replacesInvoiceId,
      account: row.account,
      customer: row.customer,
      payments: row.payments.map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        providerPaymentId: p.providerPaymentId,
      })),
      replacesInvoice: row.replacesInvoice,
      replacement: row.replacement,
      canCancel,
      canRecreate,
    };
  }
  async list(
    scope: BillingScope,
    accountId: string | null,
    page: number,
    pageSize: number,
    filter: string,
    listFilters: Record<string, string> = {},
  ) {
    const skip = (page - 1) * pageSize;
    const trimmed = filter.trim();

    const where = {
      scope,
      ...(accountId ? { accountId } : {}),
      ...(listFilters.status ? { status: listFilters.status as never } : {}),
      ...(listFilters.billingCycleKey
        ? { billingCycleKey: listFilters.billingCycleKey }
        : {}),
      ...(listFilters.dueFrom || listFilters.dueTo
        ? {
            dueDate: {
              ...(listFilters.dueFrom
                ? { gte: new Date(`${listFilters.dueFrom}T00:00:00.000Z`) }
                : {}),
              ...(listFilters.dueTo
                ? { lte: new Date(`${listFilters.dueTo}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
      ...(trimmed
        ? {
            OR: [
              { billingCycleKey: { contains: trimmed, mode: 'insensitive' as const } },
              { account: { name: { contains: trimmed, mode: 'insensitive' as const } } },
              { customer: { name: { contains: trimmed, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { dueDate: 'desc' },
        skip,
        take: pageSize,
        include: {
          account: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      scope: row.scope,
      billingCycleKey: row.billingCycleKey,
      amountCents: row.amountCents,
      dueDate: row.dueDate.toISOString(),
      status: row.status,
      pixCopyPaste: row.pixCopyPaste,
      paidAt: row.paidAt?.toISOString() ?? null,
      account: row.account,
      customer: row.customer,
    }));

    return { data, total };
  }

  async getById(scope: BillingScope, invoiceId: string, accountId: string | null) {
    const row = await prisma.invoice.findFirst({
      where: this.invoiceWhere(scope, accountId, invoiceId),
      include: {
        account: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        payments: {
          orderBy: { paidAt: 'desc' },
          select: {
            id: true,
            amountCents: true,
            method: true,
            paidAt: true,
            providerPaymentId: true,
          },
        },
        replacesInvoice: { select: { id: true, status: true } },
        replacement: { select: { id: true, status: true, amountCents: true } },
      },
    });

    if (!row) {
      return null;
    }

    return this.mapDetail(row);
  }

  async cancel(
    scope: BillingScope,
    invoiceId: string,
    accountId: string | null,
    cancelReason?: string,
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: this.invoiceWhere(scope, accountId, invoiceId),
      include: { _count: { select: { payments: true } } },
    });

    if (!invoice) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    if (!CANCELABLE_STATUSES.includes(invoice.status)) {
      throw new InvoiceActionError(
        'Somente faturas não pagas podem ser canceladas',
        'NOT_ALLOWED',
      );
    }

    if (invoice._count.payments > 0) {
      throw new InvoiceActionError(
        'Fatura com pagamento registrado não pode ser cancelada',
        'NOT_ALLOWED',
      );
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancelReason: cancelReason?.trim() || null,
        pixCopyPaste: null,
        pixQrCodeBase64: null,
        providerChargeId: null,
      },
      include: {
        account: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        payments: true,
        replacesInvoice: { select: { id: true, status: true } },
        replacement: { select: { id: true, status: true, amountCents: true } },
      },
    });

    return this.mapDetail({ ...updated, payments: [] });
  }

  async recreate(
    scope: BillingScope,
    canceledInvoiceId: string,
    accountId: string | null,
    data: { amountCents: number; dueDate: string },
  ) {
    if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
      throw new InvoiceActionError('Valor inválido', 'NOT_ALLOWED');
    }

    const dueDate = new Date(data.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new InvoiceActionError('Data de vencimento inválida', 'NOT_ALLOWED');
    }

    const source = await prisma.invoice.findFirst({
      where: this.invoiceWhere(scope, accountId, canceledInvoiceId),
      include: { replacement: { select: { id: true } } },
    });

    if (!source) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    if (source.status !== 'canceled') {
      throw new InvoiceActionError('Somente faturas canceladas podem ser recriadas', 'NOT_ALLOWED');
    }

    if (source.replacement) {
      throw new InvoiceActionError('Esta fatura já possui uma substituta', 'CONFLICT');
    }

    const activeConflict = await prisma.invoice.findFirst({
      where: {
        scope: source.scope,
        accountId: source.accountId,
        customerId: source.customerId,
        billingCycleKey: source.billingCycleKey,
        status: { not: 'canceled' },
      },
    });

    if (activeConflict) {
      throw new InvoiceActionError('Já existe uma fatura ativa para este ciclo', 'CONFLICT');
    }

    try {
      const created = await prisma.invoice.create({
        data: {
          scope: source.scope,
          accountId: source.accountId,
          customerId: source.customerId,
          billingCycleKey: source.billingCycleKey,
          amountCents: data.amountCents,
          dueDate,
          status: 'open',
          replacesInvoiceId: source.id,
        },
        include: {
          account: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          payments: true,
          replacesInvoice: { select: { id: true, status: true } },
          replacement: { select: { id: true, status: true, amountCents: true } },
        },
      });

      return this.mapDetail({ ...created, payments: [] });
    } catch {
      throw new InvoiceActionError('Não foi possível criar a fatura substituta', 'CONFLICT');
    }
  }

  /**
   * Creates a platform SaaS invoice for a tenant subscription cycle.
   */
  async createPlatformFromSubscription(params: {
    accountId: string;
    amountCents: number;
    dueDate: Date;
    billingCycleKey: string;
  }) {
    if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
      throw new InvoiceActionError('Valor inválido', 'NOT_ALLOWED');
    }

    const activeConflict = await prisma.invoice.findFirst({
      where: {
        scope: 'platform',
        accountId: params.accountId,
        customerId: null,
        billingCycleKey: params.billingCycleKey,
        status: { not: 'canceled' },
      },
    });

    if (activeConflict) {
      throw new InvoiceActionError('Já existe uma fatura SaaS ativa para este ciclo', 'CONFLICT');
    }

    const created = await prisma.invoice.create({
      data: {
        scope: 'platform',
        accountId: params.accountId,
        customerId: null,
        billingCycleKey: params.billingCycleKey,
        amountCents: params.amountCents,
        dueDate: params.dueDate,
        status: 'open',
      },
      include: {
        account: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        payments: true,
        replacesInvoice: { select: { id: true, status: true } },
        replacement: { select: { id: true, status: true, amountCents: true } },
      },
    });

    return this.mapDetail({ ...created, payments: [] });
  }

  /**
   * Creates a manual tenant invoice for a customer.
   */
  async createManual(
    tenantId: string,
    data: {
      customerId: string;
      amountCents: number;
      dueDate: string;
      billingCycleKey?: string;
      registerPayment?: boolean;
      paymentMethod?: string;
      paymentNotes?: string;
    },
  ) {
    if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
      throw new InvoiceActionError('Valor inválido', 'NOT_ALLOWED');
    }

    const dueDate = new Date(data.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new InvoiceActionError('Data de vencimento inválida', 'NOT_ALLOWED');
    }

    const billingCycleKey =
      data.billingCycleKey ??
      `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });
    if (!customer) {
      throw new InvoiceActionError('Cliente não encontrado', 'NOT_FOUND');
    }

    const conflict = await prisma.invoice.findFirst({
      where: {
        scope: 'tenant',
        accountId: tenantId,
        customerId: data.customerId,
        billingCycleKey,
        status: { not: 'canceled' },
      },
    });
    if (conflict) {
      throw new InvoiceActionError('Já existe uma fatura ativa para este ciclo', 'CONFLICT');
    }

    try {
      const created = await prisma.invoice.create({
        data: {
          scope: 'tenant',
          accountId: tenantId,
          customerId: data.customerId,
          billingCycleKey,
          amountCents: data.amountCents,
          dueDate,
          status: 'open',
        },
      });

      if (data.registerPayment) {
        await paymentConfirmation.confirm({
          invoiceId: created.id,
          tenantId,
          scope: 'tenant',
          amountCents: data.amountCents,
          method: data.paymentMethod ?? 'cash',
          source: 'manual',
          notes: data.paymentNotes,
        });
      }

      const detail = await this.getById('tenant', created.id, tenantId);
      if (!detail) {
        throw new InvoiceActionError('Fatura não encontrada após criação', 'CONFLICT');
      }
      return detail;
    } catch (error) {
      if (error instanceof InvoiceActionError) {
        throw error;
      }
      throw new InvoiceActionError('Não foi possível criar a fatura', 'CONFLICT');
    }
  }

  /** Stub: simulates PIX generation until PSP integration. */
  async generatePixStub(invoiceId: string, tenantId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(tenantId ? { accountId: tenantId } : {}),
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'canceled') {
      throw new Error('Invoice canceled');
    }

    const paymentProvider = await paymentRouter.resolveForTenant(
      invoice.accountId,
      invoice.amountCents,
    );

    const fakePix = `00020126580014BR.GOV.BCB.PIX0136${invoice.id}520400005303986540${(
      invoice.amountCents / 100
    ).toFixed(2)}5802BR5925CLIENTE MANAGER6009SAO PAULO62070503***6304ABCD`;

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        pixCopyPaste: fakePix,
        paymentProvider,
        providerChargeId: `stub_${paymentProvider}_${invoiceId}`,
        status: invoice.status === 'draft' ? 'open' : invoice.status,
      },
    });
  }

  async markPaidManual(
    invoiceId: string,
    tenantId?: string,
    options?: { method?: string; notes?: string; paidAt?: string },
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(tenantId ? { accountId: tenantId } : {}),
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    try {
      return await paymentConfirmation.confirm({
        invoiceId,
        tenantId,
        scope: invoice.scope,
        amountCents: invoice.amountCents,
        method: options?.method ?? 'manual',
        source: 'manual',
        notes: options?.notes,
        paidAt: options?.paidAt ? new Date(options.paidAt) : undefined,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Payment confirmation failed');
    }
  }
}
