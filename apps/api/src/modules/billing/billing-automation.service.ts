import type { AutomationChargeReportEntry, OverdueReminderRunSummary } from '@client-manager/shared';
import { prisma } from '../../core/database';
import { billingCycleKeyFromDate } from './account-billing.util';
import { isInvoicePastDue, startOfUtcDay } from './sync-overdue-invoices';
import { BillingAutomationReportService } from './billing-automation-report.service';
import { InvoiceChargeService } from './invoice-charge.service';
import { OverdueReminderService } from './overdue-reminder.service';
import { TenantBillingAutomationService } from './tenant-billing-automation.service';

const invoiceChargeService = new InvoiceChargeService();
const tenantBillingAutomationService = new TenantBillingAutomationService();
const billingAutomationReportService = new BillingAutomationReportService();
const overdueReminderService = new OverdueReminderService();

export interface BillingAutomationRunSummary {
  tenantsProcessed: number;
  customersScanned: number;
  invoicesCreated: number;
  chargesSent: number;
  chargesSkipped: number;
  invoicesAutoClosed: number;
  tenantReportsSent: number;
  overdueRemindersSent: number;
  overdueRemindersFailed: number;
  overdueRemindersSkippedBlocked: number;
  overdueRemindersSkippedNoPix: number;
  errors: string[];
}

/**
 * Runs D-N billing automation for tenant customers approaching expiry.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 10/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class BillingAutomationService {
  /**
   * Executes automation for tenants scheduled at the given hour, or all active tenants when hour is omitted.
   */
  async runForSchedule(filterByHour?: number): Promise<BillingAutomationRunSummary> {
    const summary: BillingAutomationRunSummary = {
      tenantsProcessed: 0,
      customersScanned: 0,
      invoicesCreated: 0,
      chargesSent: 0,
      chargesSkipped: 0,
      invoicesAutoClosed: 0,
      tenantReportsSent: 0,
      overdueRemindersSent: 0,
      overdueRemindersFailed: 0,
      overdueRemindersSkippedBlocked: 0,
      overdueRemindersSkippedNoPix: 0,
      errors: [],
    };

    const tenants = await prisma.tenantBillingAutomationConfig.findMany({
      where: {
        active: true,
        ...(filterByHour !== undefined ? { automationRunHour: filterByHour } : {}),
      },
      select: { accountId: true },
    });

    for (const tenant of tenants) {
      summary.tenantsProcessed += 1;
      try {
        const tenantSummary = await this.runForTenant(tenant.accountId);
        summary.customersScanned += tenantSummary.customersScanned;
        summary.invoicesCreated += tenantSummary.invoicesCreated;
        summary.chargesSent += tenantSummary.chargesSent;
        summary.chargesSkipped += tenantSummary.chargesSkipped;
        summary.invoicesAutoClosed += tenantSummary.invoicesAutoClosed;
        summary.tenantReportsSent += tenantSummary.tenantReportsSent;
        summary.overdueRemindersSent += tenantSummary.overdueRemindersSent;
        summary.overdueRemindersFailed += tenantSummary.overdueRemindersFailed;
        summary.overdueRemindersSkippedBlocked += tenantSummary.overdueRemindersSkippedBlocked;
        summary.overdueRemindersSkippedNoPix += tenantSummary.overdueRemindersSkippedNoPix;
        summary.errors.push(...tenantSummary.errors);
      } catch (error) {
        summary.errors.push(
          `tenant ${tenant.accountId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return summary;
  }

  /**
   * Executes billing automation for a single tenant account.
   */
  async runForTenant(accountId: string): Promise<BillingAutomationRunSummary> {
    const summary: BillingAutomationRunSummary = {
      tenantsProcessed: 1,
      customersScanned: 0,
      invoicesCreated: 0,
      chargesSent: 0,
      chargesSkipped: 0,
      invoicesAutoClosed: 0,
      tenantReportsSent: 0,
      overdueRemindersSent: 0,
      overdueRemindersFailed: 0,
      overdueRemindersSkippedBlocked: 0,
      overdueRemindersSkippedNoPix: 0,
      errors: [],
    };

    const sentCharges: AutomationChargeReportEntry[] = [];
    const runStartedAt = new Date();

    const config = await tenantBillingAutomationService.ensureRow(accountId);
    if (!config.active) {
      return summary;
    }

    if (config.autoCloseSubscriptionInvoices) {
      summary.invoicesAutoClosed = await this.autoCloseSubscriptionInvoices(
        accountId,
        config.closeSubscriptionInvoiceAfterDays,
      );
    }

    const today = startOfUtcDay(new Date());
    const windowEnd = addUtcDays(today, config.daysBeforeDue);

    const customers = await prisma.customer.findMany({
      where: {
        tenantId: accountId,
        status: 'active',
        expiresAt: {
          gte: today,
          lte: windowEnd,
        },
      },
      include: { plan: true },
    });

    for (const customer of customers) {
      if (!customer.expiresAt) continue;
      summary.customersScanned += 1;

      try {
        const billingCycleKey = billingCycleKeyFromDate(customer.expiresAt);
        let invoice = await prisma.invoice.findFirst({
          where: {
            scope: 'tenant',
            accountId,
            customerId: customer.id,
            kind: 'subscription',
            billingCycleKey,
            status: { not: 'canceled' },
          },
        });

        if (!invoice) {
          if (!customer.plan) {
            summary.errors.push(`customer ${customer.id}: sem plano para gerar fatura`);
            continue;
          }

          const amountCents = Math.round(Number(customer.plan.price) * 100);
          if (!Number.isFinite(amountCents) || amountCents <= 0) {
            summary.errors.push(`customer ${customer.id}: valor do plano inválido`);
            continue;
          }

          invoice = await prisma.invoice.create({
            data: {
              scope: 'tenant',
              kind: 'subscription',
              accountId,
              customerId: customer.id,
              billingCycleKey,
              amountCents,
              dueDate: customer.expiresAt,
              status: isInvoicePastDue(customer.expiresAt) ? 'overdue' : 'open',
            },
          });
          summary.invoicesCreated += 1;
        }

        if (!config.sendWhatsapp) {
          summary.chargesSkipped += 1;
          continue;
        }

        const alreadySent = await prisma.invoiceChargeDelivery.findFirst({
          where: {
            invoiceId: invoice.id,
            success: true,
            source: { in: ['manual', 'automation'] },
          },
          orderBy: { sentAt: 'desc' },
        });
        if (alreadySent) {
          summary.chargesSkipped += 1;
          continue;
        }

        const delivery = await invoiceChargeService.sendChargeViaWhatsApp(
          invoice.id,
          accountId,
          'automation',
        );
        summary.chargesSent += 1;
        sentCharges.push({
          customerName: customer.name,
          phoneMasked: delivery.phoneMasked ?? maskCustomerPhone(customer.phone),
          billingCycleKey: invoice.billingCycleKey,
          amountCents: invoice.amountCents,
          dueDate: invoice.dueDate,
          messagesCount: delivery.messagesCount,
        });
      } catch (error) {
        summary.errors.push(
          `customer ${customer.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (config.sendWhatsapp) {
      const overdueReminders = await overdueReminderService.runForTenant(accountId);
      summary.overdueRemindersSent = overdueReminders.sent.length;
      summary.overdueRemindersFailed = overdueReminders.failed.length;
      summary.overdueRemindersSkippedBlocked = overdueReminders.skippedBlocked;
      summary.overdueRemindersSkippedNoPix = overdueReminders.skippedNoPix;
      summary.errors.push(...overdueReminders.errors);

      const reportResult = await billingAutomationReportService.sendTenantRunReport({
        accountId,
        charges: sentCharges,
        customersScanned: summary.customersScanned,
        chargesSkipped: summary.chargesSkipped,
        invoicesCreated: summary.invoicesCreated,
        errorsCount: summary.errors.length,
        runAt: runStartedAt,
        overdueReminders,
      });

      if (reportResult.sent) {
        summary.tenantReportsSent += 1;
      } else if (reportResult.skipped) {
        summary.errors.push(`tenant report: ${reportResult.skipped}`);
      }
    }

    return summary;
  }

  /**
   * Cancels overdue subscription invoices without payments after the configured grace period.
   */
  async autoCloseSubscriptionInvoices(accountId: string, afterDays: number): Promise<number> {
    const cutoff = startOfUtcDay(new Date());
    cutoff.setUTCDate(cutoff.getUTCDate() - afterDays);

    const candidates = await prisma.invoice.findMany({
      where: {
        scope: 'tenant',
        accountId,
        kind: 'subscription',
        status: { in: ['open', 'overdue'] },
        dueDate: { lt: cutoff },
        payments: { none: {} },
      },
      select: { id: true },
    });

    if (candidates.length === 0) {
      return 0;
    }

    const result = await prisma.invoice.updateMany({
      where: { id: { in: candidates.map((row) => row.id) } },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancelReason: 'auto_close',
        pixCopyPaste: null,
        pixQrCodeBase64: null,
        providerChargeId: null,
      },
    });

    return result.count;
  }
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function maskCustomerPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return 'sem telefone';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}
