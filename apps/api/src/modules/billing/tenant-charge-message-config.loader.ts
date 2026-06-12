import { prisma } from '../../core/database';
import {
  buildChargeMessagesFromTemplates,
  resolveChargeMessageConfig,
  resolveOverdueReminderTemplates,
  type ChargeMessageTemplateContext,
} from '@client-manager/shared';
import type { InvoiceKind } from '@prisma/client';

/**
 * Loads tenant and invoice charge message configuration for WhatsApp sends.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 10/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class TenantChargeMessageConfigLoader {
  /**
   * Returns rendered charge messages and delay for an invoice send.
   */
  async buildMessages(
    accountId: string,
    context: ChargeMessageTemplateContext,
    invoiceOptions?: {
      kind: InvoiceKind;
      chargeMessageTemplates?: unknown;
      chargeMessageDelayMs?: number | null;
      description?: string | null;
    },
  ): Promise<{ messages: string[]; delayMs: number }> {
    const row = await prisma.tenantBillingAutomationConfig.findUnique({
      where: { accountId },
    });

    const kind = invoiceOptions?.kind ?? 'subscription';
    const resolved = resolveChargeMessageConfig({
      kind,
      invoiceTemplates: invoiceOptions?.chargeMessageTemplates,
      invoiceDelayMs: invoiceOptions?.chargeMessageDelayMs,
      tenantSubscriptionTemplates: row?.chargeMessageTemplates,
      tenantOneOffTemplates: row?.oneOffMessageTemplates,
      tenantDelayMs: row?.chargeMessageDelayMs ?? undefined,
    });

    const messages = buildChargeMessagesFromTemplates(resolved.templates, {
      ...context,
      description: invoiceOptions?.description ?? context.description,
    });

    return { messages, delayMs: resolved.delayMs };
  }

  /**
   * Returns rendered overdue reminder messages for a D+N window.
   */
  async buildOverdueMessages(
    accountId: string,
    context: ChargeMessageTemplateContext,
    windowDaysAfterDue: number,
  ): Promise<{ messages: string[]; delayMs: number }> {
    const row = await prisma.tenantBillingAutomationConfig.findUnique({
      where: { accountId },
    });

    const templates = resolveOverdueReminderTemplates({
      windowDaysAfterDue,
      tenantOverdueTemplates: row?.overdueMessageTemplates,
    });

    const messages = buildChargeMessagesFromTemplates(templates, context);
    const delayMs = row?.chargeMessageDelayMs ?? 1500;

    return { messages, delayMs };
  }
}
