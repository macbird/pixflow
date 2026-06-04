import type { BillingScope } from '@prisma/client';
import { prisma } from '../../core/database';
import { safeDecryptCredential } from '../../core/crypto/credential-crypto';
import {
  isMercadoPagoPaymentApproved,
  resolveMercadoPagoPaymentForWebhook,
} from '../../integrations/payment/mercadopago-payment.client';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { extractMercadoPagoPaymentId } from './payment-webhook.util';

const paymentConfirmation = new PaymentConfirmationService();

type WebhookScope = BillingScope;

interface WebhookContext {
  scope: WebhookScope;
  accountId: string | null;
  accessToken: string;
  webhookToken: string | null;
}

/**
 * Processes Mercado Pago payment webhooks and confirms invoice payment.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class PaymentWebhookService {
  /**
   * Handles Mercado Pago webhook notifications for a tenant or the platform.
   */
  async handleMercadoPago(params: {
    tenantSlug: string;
    body: unknown;
    query: Record<string, unknown>;
    token?: string;
  }) {
    const context = await this.resolveContext(params.tenantSlug);
    this.assertWebhookToken(context, params.token);

    const paymentId = extractMercadoPagoPaymentId(params.body, params.query);
    if (!paymentId) {
      return { ok: true, ignored: true, reason: 'missing_payment_id' };
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { providerPaymentId: paymentId },
    });
    if (existingPayment) {
      return { ok: true, idempotent: true, paymentId: existingPayment.id };
    }

    const invoiceHint = await this.findInvoice(context, paymentId, null);

    const mpPayment = await resolveMercadoPagoPaymentForWebhook(context.accessToken, {
      paymentId,
      externalReference: invoiceHint?.id ?? null,
      expectedAmountCents: invoiceHint?.amountCents,
    });
    if (!isMercadoPagoPaymentApproved(mpPayment.status)) {
      return { ok: true, ignored: true, status: mpPayment.status };
    }

    const invoice = await this.findInvoice(context, mpPayment.id, mpPayment.externalReference);
    if (!invoice) {
      return { ok: true, ignored: true, reason: 'invoice_not_found', paymentId: mpPayment.id };
    }

    if (invoice.status === 'paid') {
      return { ok: true, idempotent: true, invoiceId: invoice.id };
    }

    if (mpPayment.transactionAmountCents !== invoice.amountCents) {
      return {
        ok: false,
        error: 'amount_mismatch',
        expected: invoice.amountCents,
        received: mpPayment.transactionAmountCents,
      };
    }

    const result = await paymentConfirmation.confirm({
      invoiceId: invoice.id,
      tenantId: context.scope === 'tenant' ? invoice.accountId : undefined,
      scope: context.scope,
      amountCents: invoice.amountCents,
      method: 'pix',
      source: 'webhook',
      providerPaymentId: mpPayment.id,
      paidAt: mpPayment.paidAt ?? new Date(),
      notes: 'Mercado Pago webhook',
    });

    return { ok: true, ...result };
  }

  private async resolveContext(tenantSlug: string): Promise<WebhookContext> {
    if (tenantSlug === 'platform') {
      const config = await prisma.platformPaymentConfig.findUnique({ where: { id: 'default' } });
      if (!config?.apiKey) {
        throw new Error('Platform payment credentials not configured');
      }
      return {
        scope: 'platform',
        accountId: null,
        accessToken: safeDecryptCredential(config.apiKey) || config.apiKey,
        webhookToken: config.webhookToken,
      };
    }

    const account = await prisma.account.findUnique({ where: { slug: tenantSlug } });
    if (!account) {
      throw new Error('Tenant not found');
    }

    const credential = await prisma.tenantPaymentCredential.findUnique({
      where: {
        accountId_provider: { accountId: account.id, provider: 'mercadopago' },
      },
    });

    if (!credential?.active || !credential.apiKey) {
      throw new Error('Mercado Pago credentials not configured for tenant');
    }

    return {
      scope: 'tenant',
      accountId: account.id,
      accessToken: safeDecryptCredential(credential.apiKey) || credential.apiKey,
      webhookToken: credential.webhookToken,
    };
  }

  private assertWebhookToken(context: WebhookContext, token?: string) {
    if (!context.webhookToken) return;
    if (!token || token !== context.webhookToken) {
      throw new Error('Invalid webhook token');
    }
  }

  private async findInvoice(
    context: WebhookContext,
    providerChargeId: string,
    externalReference: string | null,
  ) {
    return prisma.invoice.findFirst({
      where: {
        scope: context.scope,
        ...(context.accountId ? { accountId: context.accountId } : {}),
        OR: [
          { providerChargeId },
          ...(externalReference ? [{ id: externalReference }] : []),
        ],
      },
    });
  }
}
