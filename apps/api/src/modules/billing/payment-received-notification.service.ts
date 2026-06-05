import { buildPaymentReceivedNotificationMessage, normalizePhoneE164 } from '@client-manager/shared';
import { prisma } from '../../core/database';
import { WhatsAppProviderFactory } from '../../integrations/whatsapp/whatsapp-provider.factory';

const whatsappFactory = new WhatsAppProviderFactory();

export interface PaymentReceivedNotificationInput {
  invoiceId: string;
  paymentId: string;
  method: string;
  source?: string | null;
  activationTasksCreated?: number;
}

/**
 * Sends WhatsApp alerts to the tenant when a payment is confirmed.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class PaymentReceivedNotificationService {
  /**
   * Notifies the tenant owner via WhatsApp after a successful payment confirmation.
   * Failures are logged and do not affect payment registration.
   */
  async notifyTenant(input: PaymentReceivedNotificationInput): Promise<{
    sent: boolean;
    skipped?: string;
    phoneMasked?: string;
    providerMessageId?: string;
  }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        customer: { select: { name: true } },
        account: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!invoice || invoice.scope !== 'tenant') {
      return { sent: false, skipped: 'not_tenant_scope' };
    }

    const phone = resolveTenantNotifyPhone(invoice.account.phone);
    if (!phone) {
      return { sent: false, skipped: 'missing_notify_phone' };
    }

    const message = buildPaymentReceivedNotificationMessage({
      accountName: invoice.account.name,
      customerName: invoice.customer?.name,
      amountCents: invoice.amountCents,
      billingCycleKey: invoice.billingCycleKey,
      method: input.method,
      source: input.source,
      activationTasksCreated: input.activationTasksCreated,
    });

    try {
      const whatsapp = await whatsappFactory.getProvider('tenant', invoice.accountId);
      const result = await whatsapp.sendText({ phoneE164: phone, text: message });
      return {
        sent: true,
        phoneMasked: maskPhone(phone),
        providerMessageId: result.providerMessageId,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'whatsapp_send_failed';
      console.warn('[payment-received-notification]', reason);
      return { sent: false, skipped: reason };
    }
  }
}

/**
 * Resolves E.164 digits for the tenant notification recipient.
 */
export function resolveTenantNotifyPhone(accountPhone: string | null | undefined): string | null {
  const override = process.env.PAYMENT_NOTIFY_PHONE?.trim();
  const raw = override || accountPhone?.trim();
  if (!raw) return null;
  const normalized = normalizePhoneE164(raw);
  return normalized || null;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
