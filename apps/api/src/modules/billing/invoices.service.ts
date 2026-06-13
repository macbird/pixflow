import { randomUUID } from 'crypto';
import { prisma } from '../../core/database';
import type { BillingScope, BillingInvoiceStatus, PaymentProviderType, InvoiceKind } from '@prisma/client';
import { normalizePhoneE164, PAYABLE_INVOICE_STATUSES, resolveChargeMessageConfig } from '@client-manager/shared';
import { InvoiceActionError } from './invoice-errors';
import { PaymentGenerationService } from '../../integrations/payment/payment-generation.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { isInvoicePastDue, syncOverdueInvoices } from './sync-overdue-invoices';
import { compareInvoicesByStatusThenDueDate } from './invoice-list-order.util';

const CANCELABLE_STATUSES: BillingInvoiceStatus[] = ['draft', 'open', 'overdue'];
const paymentGeneration = new PaymentGenerationService();
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
    kind: InvoiceKind;
    description: string | null;
    billingCycleKey: string;
    amountCents: number;
    dueDate: Date;
    status: BillingInvoiceStatus;
    pixCopyPaste: string | null;
    pixQrCodeBase64: string | null;
    paidAt: Date | null;
    paymentProvider: PaymentProviderType | null;
    providerChargeId: string | null;
    chargeMessageTemplates: unknown;
    chargeMessageDelayMs: number | null;
    createdAt: Date;
    updatedAt: Date;
    canceledAt: Date | null;
    cancelReason: string | null;
    replacesInvoiceId: string | null;
    account: { id: string; name: string; phone: string | null };
    customer: { id: string; name: string; phone: string | null } | null;
    payments: Array<{
      id: string;
      amountCents: number;
      method: string;
      paidAt: Date;
      providerPaymentId: string | null;
    }>;
    replacesInvoice: { id: string; status: BillingInvoiceStatus } | null;
    replacement: { id: string; status: BillingInvoiceStatus; amountCents: number } | null;
    chargeDeliveries?: Array<{
      id: string;
      channel: string;
      source: string;
      sentAt: Date;
      messagesCount: number;
      success: boolean;
      errorMessage: string | null;
      windowDaysAfterDue: number | null;
    }>;
  }, tenantMessageConfig?: {
    chargeMessageTemplates: unknown;
    oneOffMessageTemplates: unknown;
    chargeMessageDelayMs: number;
  }) {
    const canCancel =
      CANCELABLE_STATUSES.includes(row.status) && row.payments.length === 0;
    const canRecreate = row.status === 'canceled' && row.replacement === null;

    const payerName = row.customer?.name ?? row.account.name;
    const chargeMessages = tenantMessageConfig
      ? resolveChargeMessageConfig({
          kind: row.kind,
          invoiceTemplates: row.chargeMessageTemplates,
          invoiceDelayMs: row.chargeMessageDelayMs,
          tenantSubscriptionTemplates: tenantMessageConfig.chargeMessageTemplates,
          tenantOneOffTemplates: tenantMessageConfig.oneOffMessageTemplates,
          tenantDelayMs: tenantMessageConfig.chargeMessageDelayMs,
        })
      : null;
    const lastDelivery = row.chargeDeliveries?.[0];

    return {
      id: row.id,
      scope: row.scope,
      kind: row.kind,
      description: row.description,
      billingCycleKey: row.billingCycleKey,
      amountCents: row.amountCents,
      dueDate: row.dueDate.toISOString(),
      status: row.status,
      pixCopyPaste: row.pixCopyPaste,
      pixQrCodeBase64: row.pixQrCodeBase64,
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
      payerPhone: resolvePayerPhone(row),
      chargeMessages,
      lastChargeDelivery: lastDelivery
        ? {
            id: lastDelivery.id,
            channel: lastDelivery.channel,
            source: lastDelivery.source,
            sentAt: lastDelivery.sentAt.toISOString(),
            messagesCount: lastDelivery.messagesCount,
            success: lastDelivery.success,
            errorMessage: lastDelivery.errorMessage,
            windowDaysAfterDue: lastDelivery.windowDaysAfterDue,
          }
        : null,
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
    await syncOverdueInvoices(scope, accountId ?? undefined);

    const skip = (page - 1) * pageSize;
    const trimmed = filter.trim();

    const statusFilter = listFilters.payableOnly === 'true'
      ? { status: { in: [...PAYABLE_INVOICE_STATUSES] as BillingInvoiceStatus[] } }
      : listFilters.status
        ? { status: listFilters.status as BillingInvoiceStatus }
        : {};

    const where = {
      scope,
      ...(accountId ? { accountId } : {}),
      ...statusFilter,
      ...(listFilters.customerId ? { customerId: listFilters.customerId } : {}),
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

    const [sortKeys, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        select: { id: true, status: true, dueDate: true },
      }),
      prisma.invoice.count({ where }),
    ]);

    const pageIds = sortKeys
      .sort(compareInvoicesByStatusThenDueDate)
      .slice(skip, skip + pageSize)
      .map((row) => row.id);

    if (pageIds.length === 0) {
      return { data: [], total };
    }

    const rows = await prisma.invoice.findMany({
      where: { id: { in: pageIds } },
      include: {
        account: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const orderedRows = pageIds
      .map((id) => rowsById.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);

    const data = orderedRows.map((row) => ({
      id: row.id,
      scope: row.scope,
      kind: row.kind,
      description: row.description,
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
    await syncOverdueInvoices(scope, accountId ?? undefined);

    const row = await prisma.invoice.findFirst({
      where: this.invoiceWhere(scope, accountId, invoiceId),
      include: {
        account: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
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
        chargeDeliveries: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: {
            id: true,
            channel: true,
            source: true,
            sentAt: true,
            messagesCount: true,
            success: true,
            errorMessage: true,
            windowDaysAfterDue: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    const tenantMessageConfig =
      row.scope === 'tenant'
        ? await prisma.tenantBillingAutomationConfig.findUnique({
            where: { accountId: row.accountId },
          })
        : null;

    return this.mapDetail(row, tenantMessageConfig ?? undefined);
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
        account: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
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
        kind: 'subscription',
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
          kind: source.kind,
          accountId: source.accountId,
          customerId: source.customerId,
          billingCycleKey: source.billingCycleKey,
          amountCents: data.amountCents,
          dueDate,
          status: 'open',
          replacesInvoiceId: source.id,
        },
        include: {
          account: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
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
        account: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
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
      kind?: InvoiceKind;
      description?: string;
      billingCycleKey?: string;
      chargeMessages?: { templates: string[]; delayMs: number };
      registerPayment?: boolean;
      paymentMethod?: string;
      paymentNotes?: string;
    },
    accountUserId?: string | null,
  ) {
    if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
      throw new InvoiceActionError('Valor inválido', 'NOT_ALLOWED');
    }

    const dueDate = new Date(data.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new InvoiceActionError('Data de vencimento inválida', 'NOT_ALLOWED');
    }

    const kind: InvoiceKind = data.kind ?? 'subscription';
    const billingCycleKey =
      kind === 'one_off'
        ? `one-off-${randomUUID().slice(0, 8)}`
        : data.billingCycleKey ??
          `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });
    if (!customer) {
      throw new InvoiceActionError('Cliente não encontrado', 'NOT_FOUND');
    }
    if (customer.status === 'inactive') {
      throw new InvoiceActionError('Cliente desativado', 'NOT_ALLOWED');
    }

    if (kind === 'subscription') {
      const conflict = await prisma.invoice.findFirst({
        where: {
          scope: 'tenant',
          accountId: tenantId,
          customerId: data.customerId,
          kind: 'subscription',
          billingCycleKey,
          status: { not: 'canceled' },
        },
      });
      if (conflict) {
        throw new InvoiceActionError('Já existe uma fatura de assinatura ativa para este ciclo', 'CONFLICT');
      }
    }

    try {
      const created = await prisma.invoice.create({
        data: {
          scope: 'tenant',
          kind,
          accountId: tenantId,
          customerId: data.customerId,
          billingCycleKey,
          description: kind === 'one_off' ? data.description?.trim() ?? null : null,
          amountCents: data.amountCents,
          dueDate,
          status: isInvoicePastDue(dueDate) ? 'overdue' : 'open',
          chargeMessageTemplates: data.chargeMessages?.templates,
          chargeMessageDelayMs: data.chargeMessages?.delayMs,
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
          accountUserId,
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

  /**
   * Updates charge message templates for a one-off invoice.
   */
  async updateChargeMessages(
    scope: BillingScope,
    invoiceId: string,
    accountId: string | null,
    data: { templates: string[]; delayMs: number },
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: this.invoiceWhere(scope, accountId, invoiceId),
    });

    if (!invoice) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    if (invoice.kind !== 'one_off') {
      throw new InvoiceActionError(
        'Somente faturas avulsas possuem mensagem personalizada por fatura',
        'NOT_ALLOWED',
      );
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        chargeMessageTemplates: data.templates,
        chargeMessageDelayMs: data.delayMs,
      },
    });

    const detail = await this.getById(scope, invoiceId, accountId);
    if (!detail) {
      throw new InvoiceActionError('Fatura não encontrada após atualização', 'CONFLICT');
    }
    return detail;
  }

  /**
   * Generates PIX copia e cola via configured PSP (Mercado Pago when credentials are present).
   */
  async generatePayment(invoiceId: string, tenantId?: string) {
    return paymentGeneration.generatePayment(invoiceId, tenantId);
  }

  async markPaidManual(
    invoiceId: string,
    tenantId?: string,
    options?: { method?: string; notes?: string; paidAt?: string; accountUserId?: string | null },
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(tenantId ? { accountId: tenantId } : {}),
      },
    });

    if (!invoice) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    return paymentConfirmation.confirm({
      invoiceId,
      tenantId,
      scope: invoice.scope,
      amountCents: invoice.amountCents,
      method: options?.method ?? 'manual',
      source: 'manual',
      notes: options?.notes,
      paidAt: options?.paidAt ? new Date(options.paidAt) : undefined,
      accountUserId: options?.accountUserId,
    });
  }
}

function resolvePayerPhone(row: {
  customer: { phone: string | null } | null;
  account: { phone: string | null };
}): string | null {
  const raw = row.customer?.phone ?? row.account.phone;
  if (!raw) return null;
  const normalized = normalizePhoneE164(raw);
  return normalized || null;
}
