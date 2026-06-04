import type { BillingScope } from '@prisma/client';
import { PAYMENT_PROVIDER_LABELS } from '@client-manager/shared';
import { prisma } from '../../core/database';
import { InvoiceActionError } from '../../modules/billing/invoice-errors';
import { PaymentProviderError } from './payment-provider.errors';
import { PaymentProviderFactory } from './payment-provider.factory';
import type { CreateChargeInput } from './payment-provider.interface';

const factory = new PaymentProviderFactory();

/**
 * Generates PIX charges via configured PSP adapters.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class PaymentGenerationService {
  /**
   * Creates or refreshes PIX copia e cola for an invoice using the tenant/platform PSP.
   */
  async generatePayment(invoiceId: string, tenantId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(tenantId ? { accountId: tenantId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        account: {
          select: {
            id: true,
            name: true,
            phone: true,
            users: { select: { email: true, name: true }, take: 1, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!invoice) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    if (invoice.status === 'canceled') {
      throw new InvoiceActionError('Fatura cancelada', 'NOT_ALLOWED');
    }

    if (invoice.status === 'paid') {
      throw new InvoiceActionError('Fatura já está paga', 'NOT_ALLOWED');
    }

    if (
      invoice.pixCopyPaste &&
      invoice.providerChargeId &&
      !invoice.providerChargeId.startsWith('stub_')
    ) {
      return invoice;
    }

    const provider = await factory.resolveProvider(
      invoice.scope,
      invoice.accountId,
      invoice.amountCents,
    );

    const apiKey = await factory.getApiKey(invoice.scope, invoice.accountId, provider);
    if (!apiKey) {
      const providerLabel =
        PAYMENT_PROVIDER_LABELS[provider as keyof typeof PAYMENT_PROVIDER_LABELS] ?? provider;
      const settingsHint =
        invoice.scope === 'platform'
          ? 'Configurações admin da plataforma'
          : 'Configurações → Pagamento';
      throw new InvoiceActionError(
        `Provider ${providerLabel} não configurado. Informe a API key em ${settingsHint}.`,
        'NOT_ALLOWED',
      );
    }

    const charge = await this.createRealCharge(invoice, provider);

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        pixCopyPaste: charge.copyPasteCode,
        pixQrCodeBase64: charge.qrCodeBase64 ?? null,
        paymentProvider: provider,
        providerChargeId: charge.providerChargeId,
        status: invoice.status === 'draft' ? 'open' : invoice.status,
      },
    });
  }

  private async createRealCharge(
    invoice: {
      id: string;
      scope: BillingScope;
      accountId: string;
      amountCents: number;
      dueDate: Date;
      billingCycleKey: string;
      customer: { id: string; name: string; email: string | null; phone: string | null } | null;
      account: {
        name: string;
        phone: string | null;
        users: Array<{ email: string; name: string }>;
      };
    },
    provider: Awaited<ReturnType<PaymentProviderFactory['resolveProvider']>>,
  ) {
    const adapter = await factory.getProvider(invoice.scope, invoice.accountId, provider);
    const payer = resolvePayer(invoice);
    const input: CreateChargeInput = {
      tenantId: invoice.accountId,
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
      dueDate: invoice.dueDate,
      payerName: payer.name,
      payerEmail: payer.email,
      payerPhone: payer.phone,
      payerExternalRef: payer.externalRef,
      description: `Cobrança ${invoice.billingCycleKey}`,
    };

    try {
      return await adapter.createCharge(input);
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw new InvoiceActionError(error.message, 'CONFLICT');
      }
      throw error;
    }
  }
}

function resolvePayer(invoice: {
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  account: {
    name: string;
    phone: string | null;
    users: Array<{ email: string; name: string }>;
  };
}) {
  const owner = invoice.account.users[0];

  if (invoice.customer) {
    const customerEmail = invoice.customer.email?.trim();
    const payerEmail =
      customerEmail && !customerEmail.toLowerCase().endsWith('@testuser.com')
        ? customerEmail
        : owner?.email;
    return {
      name: invoice.customer.name,
      email: payerEmail,
      phone: invoice.customer.phone ?? undefined,
      externalRef: invoice.customer.id,
    };
  }

  return {
    name: owner?.name ?? invoice.account.name,
    email: owner?.email,
    phone: invoice.account.phone ?? undefined,
    externalRef: invoice.account.name,
  };
}
