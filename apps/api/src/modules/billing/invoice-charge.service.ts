import { prisma } from '../../core/database';
import { buildBillingChargeMessage, normalizePhoneE164 } from '@client-manager/shared';
import { PaymentGenerationService } from '../../integrations/payment/payment-generation.service';
import { WhatsAppProviderFactory } from '../../integrations/whatsapp/whatsapp-provider.factory';
import { InvoiceActionError } from './invoice-errors';

const paymentGeneration = new PaymentGenerationService();
const whatsappFactory = new WhatsAppProviderFactory();

/**
 * Sends PIX billing charges via WhatsApp after ensuring PIX is generated.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class InvoiceChargeService {
  /**
   * Generates PIX (if needed) and sends the billing message to the payer phone.
   */
  async sendChargeViaWhatsApp(invoiceId: string, tenantId?: string) {
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

    if (invoice.status === 'canceled') {
      throw new InvoiceActionError('Fatura cancelada', 'NOT_ALLOWED');
    }

    if (invoice.status === 'paid') {
      throw new InvoiceActionError('Fatura já está paga', 'NOT_ALLOWED');
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

    const message = buildBillingChargeMessage({
      payerName,
      invoice: {
        pixCopyPaste: invoice.pixCopyPaste,
        amountCents: invoice.amountCents,
        billingCycleKey: invoice.billingCycleKey,
        dueDate: invoice.dueDate,
      },
    });

    let whatsapp;
    try {
      whatsapp = await whatsappFactory.getProvider(invoice.scope, invoice.accountId);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'WhatsApp não configurado';
      throw new InvoiceActionError(messageText, 'NOT_ALLOWED');
    }

    let result: { providerMessageId: string };
    try {
      result = await whatsapp.sendText({ phoneE164: phone, text: message });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Falha ao enviar WhatsApp';
      throw new InvoiceActionError(messageText, 'CONFLICT');
    }

    return {
      sent: true,
      providerMessageId: result.providerMessageId,
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
