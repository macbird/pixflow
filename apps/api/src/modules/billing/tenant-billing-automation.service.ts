import {
  DEFAULT_OVERDUE_REMINDERS_SETTINGS,
  normalizeOverdueReminderDays,
  type OverdueRemindersSettingsDto,
} from '@client-manager/shared';
import { prisma } from '../../core/database';
import type { BillingAutomationSettingsDto, BillingAutomationSettingsInput } from '@client-manager/shared';

/**
 * Loads and updates tenant billing automation settings.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 12/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class TenantBillingAutomationService {
  /**
   * Returns billing automation settings for the tenant.
   */
  async get(tenantId: string): Promise<BillingAutomationSettingsDto> {
    const row = await this.ensureRow(tenantId);
    return mapBillingAutomationSettings(row);
  }

  /**
   * Updates billing automation settings for the tenant.
   */
  async update(
    tenantId: string,
    input: BillingAutomationSettingsInput,
  ): Promise<BillingAutomationSettingsDto> {
    const overdueReminderDays = normalizeOverdueReminderDays(input.overdueReminders.daysAfterDue);

    const row = await prisma.tenantBillingAutomationConfig.upsert({
      where: { accountId: tenantId },
      create: {
        accountId: tenantId,
        active: input.active,
        daysBeforeDue: input.daysBeforeDue,
        sendWhatsapp: input.sendWhatsapp,
        sendPaymentCharge: input.sendPaymentCharge,
        automationRunHour: input.automationRunHour,
        automationRunMinute: input.automationRunMinute,
        autoCloseSubscriptionInvoices: input.autoCloseSubscriptionInvoices,
        closeSubscriptionInvoiceAfterDays: input.closeSubscriptionInvoiceAfterDays,
        overdueRemindersEnabled: input.overdueReminders.enabled,
        overdueReminderDays,
        overdueReminderFailureGraceDays: input.overdueReminders.failureGraceDays,
      },
      update: {
        active: input.active,
        daysBeforeDue: input.daysBeforeDue,
        sendWhatsapp: input.sendWhatsapp,
        sendPaymentCharge: input.sendPaymentCharge,
        automationRunHour: input.automationRunHour,
        automationRunMinute: input.automationRunMinute,
        autoCloseSubscriptionInvoices: input.autoCloseSubscriptionInvoices,
        closeSubscriptionInvoiceAfterDays: input.closeSubscriptionInvoiceAfterDays,
        overdueRemindersEnabled: input.overdueReminders.enabled,
        overdueReminderDays,
        overdueReminderFailureGraceDays: input.overdueReminders.failureGraceDays,
      },
    });

    return mapBillingAutomationSettings(row);
  }

  /**
   * Ensures a billing automation config row exists for the tenant.
   */
  async ensureRow(tenantId: string) {
    return prisma.tenantBillingAutomationConfig.upsert({
      where: { accountId: tenantId },
      create: { accountId: tenantId },
      update: {},
    });
  }
}

function mapBillingAutomationSettings(row: {
  active: boolean;
  daysBeforeDue: number;
  sendWhatsapp: boolean;
  sendPaymentCharge: boolean;
  automationRunHour: number;
  automationRunMinute: number;
  autoCloseSubscriptionInvoices: boolean;
  closeSubscriptionInvoiceAfterDays: number;
  overdueRemindersEnabled: boolean;
  overdueReminderDays: number[];
  overdueReminderFailureGraceDays: number;
}): BillingAutomationSettingsDto {
  const daysAfterDue =
    row.overdueReminderDays.length > 0
      ? normalizeOverdueReminderDays(row.overdueReminderDays)
      : [...DEFAULT_OVERDUE_REMINDERS_SETTINGS.daysAfterDue];

  const overdueReminders: OverdueRemindersSettingsDto = {
    enabled: row.overdueRemindersEnabled,
    daysAfterDue,
    failureGraceDays: row.overdueReminderFailureGraceDays,
  };

  return {
    active: row.active,
    daysBeforeDue: row.daysBeforeDue,
    sendWhatsapp: row.sendWhatsapp,
    sendPaymentCharge: row.sendPaymentCharge,
    automationRunHour: row.automationRunHour,
    automationRunMinute: row.automationRunMinute,
    autoCloseSubscriptionInvoices: row.autoCloseSubscriptionInvoices,
    closeSubscriptionInvoiceAfterDays: row.closeSubscriptionInvoiceAfterDays,
    overdueReminders,
  };
}
