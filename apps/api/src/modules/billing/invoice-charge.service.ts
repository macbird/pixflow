import { prisma } from '../../core/database';
import {
  isPayableInvoiceStatus,
  normalizePhoneE164,
  type BillingInvoiceStatusValue,
} from '@client-manager/shared';
import { PaymentGenerationService } from '../../integrations/payment/payment-generation.service';
import { WhatsAppProviderFactory } from '../../integrations/whatsapp/whatsapp-provider.factory';
import { InvoiceActionError } from './invoice-errors';
import { TenantChargeMessageConfigLoader } from './tenant-charge-message-config.loader';

const paymentGeneration = new PaymentGenerationService();
const whatsappFactory = new WhatsAppProviderFactory();
const chargeMessageConfigLoader = new TenantChargeMessageConfigLoader();

/**
 * Sends PIX billing charges via WhatsApp after ensuring PIX is generated.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class InvoiceChargeService {
  /**
   * Generates PIX (if needed) and sends billing messages to the payer phone.
   */
  async sendChargeViaWhatsApp(
    invoiceId: string,
    tenantId?: string,
    source: 'manual' | 'automation' = 'manual',
  ) {
    let invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(tenantId ? { accountId: tenantId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        account: {
          select: {
            name: true,
            phone: true,
            users: { select: { name: true }, take: 1, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!invoice) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    if (!isPayableInvoiceStatus(invoice.status as BillingInvoiceStatusValue)) {
      if (invoice.status === 'canceled') {
        throw new InvoiceActionError('Fatura cancelada', 'NOT_ALLOWED');
      }
      if (invoice.status === 'paid') {
        throw new InvoiceActionError('Fatura já está paga', 'NOT_ALLOWED');
      }
      throw new InvoiceActionError('Fatura não está elegível para cobrança', 'NOT_ALLOWED');
    }

    if (!invoice.pixCopyPaste) {
      const updated = await paymentGeneration.generatePayment(invoiceId, tenantId);
      invoice = {
        ...invoice,
        pixCopyPaste: updated.pixCopyPaste,
        paymentProvider: updated.paymentProvider,
        providerChargeId: updated.providerChargeId,
      };
    }

    const phone = resolvePayerPhone(invoice);
    if (!phone) {
      throw new InvoiceActionError(
        'Telefone do cliente não cadastrado para envio via WhatsApp',
        'NOT_ALLOWED',
      );
    }

    const payerName =
      invoice.customer?.name ?? invoice.account.users[0]?.name ?? invoice.account.name;

    const { messages, delayMs } = await chargeMessageConfigLoader.buildMessages(
      invoice.accountId,
      {
        payerName,
        tenantName: invoice.account.name,
        description: invoice.description ?? undefined,
        invoice: {
          pixCopyPaste: invoice.pixCopyPaste,
          amountCents: invoice.amountCents,
          billingCycleKey: invoice.billingCycleKey,
          dueDate: invoice.dueDate,
        },
      },
      {
        kind: invoice.kind,
        chargeMessageTemplates: invoice.chargeMessageTemplates,
        chargeMessageDelayMs: invoice.chargeMessageDelayMs,
        description: invoice.description,
      },
    );

    if (messages.length === 0) {
      throw new InvoiceActionError(
        'Nenhuma mensagem de cobrança configurada. Ajuste em Configurações → Mensagem de cobrança.',
        'NOT_ALLOWED',
      );
    }

    let whatsapp;
    try {
      whatsapp = await whatsappFactory.getProvider(invoice.scope, invoice.accountId);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'WhatsApp não configurado';
      throw new InvoiceActionError(messageText, 'NOT_ALLOWED');
    }

    const providerMessageIds: string[] = [];

    try {
      for (let index = 0; index < messages.length; index += 1) {
        const result = await whatsapp.sendText({ phoneE164: phone, text: messages[index] });
        providerMessageIds.push(result.providerMessageId);

        if (index < messages.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      await prisma.invoiceChargeDelivery.create({
        data: {
          invoiceId: invoice.id,
          channel: 'whatsapp',
          source,
          messagesCount: messages.length,
          providerMessageIds,
          success: true,
        },
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Falha ao enviar WhatsApp';
      await prisma.invoiceChargeDelivery.create({
        data: {
          invoiceId: invoice.id,
          channel: 'whatsapp',
          source,
          messagesCount: providerMessageIds.length,
          providerMessageIds,
          success: false,
          errorMessage: messageText,
        },
      });
      throw new InvoiceActionError(messageText, 'CONFLICT');
    }

    return {
      sent: true,
      messagesCount: messages.length,
      providerMessageId: providerMessageIds[providerMessageIds.length - 1] ?? null,
      providerMessageIds,
      phoneMasked: maskPhone(phone),
    };
  }

  /**
   * Sends an overdue reminder via WhatsApp using the existing PIX on the invoice.
   * Does not create invoices or regenerate PIX.
   */
  async sendOverdueReminderViaWhatsApp(
    invoiceId: string,
    tenantId: string,
    windowDaysAfterDue: number,
    daysOverdue: number,
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, accountId: tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, status: true } },
        account: {
          select: {
            name: true,
            phone: true,
            users: { select: { name: true }, take: 1, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!invoice) {
      throw new InvoiceActionError('Fatura não encontrada', 'NOT_FOUND');
    }

    if (!isPayableInvoiceStatus(invoice.status as BillingInvoiceStatusValue)) {
      throw new InvoiceActionError('Fatura não está elegível para lembrete', 'NOT_ALLOWED');
    }

    if (!invoice.pixCopyPaste?.trim()) {
      throw new InvoiceActionError('PIX não disponível na fatura', 'NOT_ALLOWED');
    }

    if (invoice.customer?.status !== 'active') {
      throw new InvoiceActionError('Cliente bloqueado ou inativo', 'NOT_ALLOWED');
    }

    const phone = resolvePayerPhone(invoice);
    if (!phone) {
      throw new InvoiceActionError(
        'Telefone do cliente não cadastrado para envio via WhatsApp',
        'NOT_ALLOWED',
      );
    }

    const payerName =
      invoice.customer?.name ?? invoice.account.users[0]?.name ?? invoice.account.name;

    const { messages, delayMs } = await chargeMessageConfigLoader.buildOverdueMessages(
      invoice.accountId,
      {
        payerName,
        tenantName: invoice.account.name,
        daysOverdue,
        invoice: {
          pixCopyPaste: invoice.pixCopyPaste,
          amountCents: invoice.amountCents,
          billingCycleKey: invoice.billingCycleKey,
          dueDate: invoice.dueDate,
        },
      },
      windowDaysAfterDue,
    );

    if (messages.length === 0) {
      throw new InvoiceActionError(
        'Nenhuma mensagem de lembrete configurada',
        'NOT_ALLOWED',
      );
    }

    let whatsapp;
    try {
      whatsapp = await whatsappFactory.getProvider(invoice.scope, invoice.accountId);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'WhatsApp não configurado';
      throw new InvoiceActionError(messageText, 'NOT_ALLOWED');
    }

    const providerMessageIds: string[] = [];
    const source = 'automation_overdue';

    try {
      for (let index = 0; index < messages.length; index += 1) {
        const result = await whatsapp.sendText({ phoneE164: phone, text: messages[index] });
        providerMessageIds.push(result.providerMessageId);

        if (index < messages.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      await prisma.invoiceChargeDelivery.create({
        data: {
          invoiceId: invoice.id,
          channel: 'whatsapp',
          source,
          windowDaysAfterDue,
          messagesCount: messages.length,
          providerMessageIds,
          success: true,
        },
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Falha ao enviar WhatsApp';
      await prisma.invoiceChargeDelivery.create({
        data: {
          invoiceId: invoice.id,
          channel: 'whatsapp',
          source,
          windowDaysAfterDue,
          messagesCount: providerMessageIds.length,
          providerMessageIds,
          success: false,
          errorMessage: messageText,
        },
      });
      throw new InvoiceActionError(messageText, 'CONFLICT');
    }

    return {
      sent: true,
      messagesCount: messages.length,
      providerMessageId: providerMessageIds[providerMessageIds.length - 1] ?? null,
      providerMessageIds,
      phoneMasked: maskPhone(phone),
    };
  }
}

function resolvePayerPhone(invoice: {
  scope: string;
  customer: { phone: string | null } | null;
  account: { phone: string | null };
}): string | null {
  const raw = invoice.customer?.phone ?? invoice.account.phone;
  if (!raw) return null;
  return normalizePhoneE164(raw);
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
