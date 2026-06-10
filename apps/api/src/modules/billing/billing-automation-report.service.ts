import {
  buildBillingAutomationReportMessage,
  normalizePhoneE164,
  type AutomationChargeReportEntry,
} from '@client-manager/shared';
import { prisma } from '../../core/database';
import { WhatsAppProviderFactory } from '../../integrations/whatsapp/whatsapp-provider.factory';

const whatsappFactory = new WhatsAppProviderFactory();

export interface BillingAutomationReportInput {
  accountId: string;
  charges: AutomationChargeReportEntry[];
  customersScanned: number;
  chargesSkipped: number;
  invoicesCreated: number;
  errorsCount: number;
  runAt?: Date;
}

/**
 * Sends a WhatsApp summary to the tenant owner after a billing automation run.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 10/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class BillingAutomationReportService {
  /**
   * Delivers the automation charge report to the tenant notification phone.
   * Failures are logged and do not fail the scheduler run.
   */
  async sendTenantRunReport(input: BillingAutomationReportInput): Promise<{
    sent: boolean;
    skipped?: string;
    phoneMasked?: string;
    providerMessageId?: string;
  }> {
    const account = await prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true, name: true, phone: true },
    });

    if (!account) {
      return { sent: false, skipped: 'account_not_found' };
    }

    const phone = resolveTenantNotifyPhone(account.phone);
    if (!phone) {
      return { sent: false, skipped: 'missing_notify_phone' };
    }

    const message = buildBillingAutomationReportMessage({
      tenantName: account.name,
      runAt: input.runAt ?? new Date(),
      charges: input.charges,
      customersScanned: input.customersScanned,
      chargesSkipped: input.chargesSkipped,
      invoicesCreated: input.invoicesCreated,
      errorsCount: input.errorsCount,
    });

    try {
      const whatsapp = await whatsappFactory.getProvider('tenant', account.id);
      const result = await whatsapp.sendText({ phoneE164: phone, text: message });
      return {
        sent: true,
        phoneMasked: maskPhone(phone),
        providerMessageId: result.providerMessageId,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'whatsapp_send_failed';
      console.warn('[billing-automation-report]', reason);
      return { sent: false, skipped: reason };
    }
  }
}

function resolveTenantNotifyPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  return normalizePhoneE164(phone);
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
