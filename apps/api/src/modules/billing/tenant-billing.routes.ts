import { FastifyInstance } from 'fastify';
import { createManualInvoiceSchema, registerPaymentSchema, tenantChargeMessagesSettingsSchema, billingAutomationSettingsSchema, updateInvoiceChargeMessagesSchema } from '@client-manager/shared';
import { requireTenantId } from '../../core/middleware/require-tenant';
import { resolveActorUserId } from '../../core/utils/actor-user-id';
import { sendApiError, sendNotFound, sendValidationError } from '../../core/errors/send-api-error';
import { TenantSettingsService } from './tenant-settings.service';
import { TenantPaymentSettingsService } from './tenant-payment-settings.service';
import { TenantChargeMessageService } from './tenant-charge-message.service';
import { TenantBillingAutomationService } from './tenant-billing-automation.service';
import { BillingAutomationPreviewService } from './billing-automation-preview.service';
import { BillingJobRunService } from './billing-job-run.service';
import { getBillingAutomationSchedulerMeta } from './billing-scheduler.util';
import { InvoicesService } from './invoices.service';
import { InvoiceChargeService } from './invoice-charge.service';
import { PaymentsService } from './payments.service';
import { handleInvoiceActionError } from './invoice-route.util';
import { pickListFilters } from '../../core/utils/parse-list-filters';
import { PaymentWebhookLogService } from './payment-webhook-log.service';

const INVOICE_LIST_FILTER_KEYS = [
  'status',
  'billingCycleKey',
  'dueFrom',
  'dueTo',
  'customerId',
  'payableOnly',
] as const;
const PAYMENT_LIST_FILTER_KEYS = ['method', 'billingCycleKey', 'paidFrom', 'paidTo'] as const;

const tenantSettings = new TenantSettingsService();
const tenantPaymentSettings = new TenantPaymentSettingsService();
const tenantChargeMessageService = new TenantChargeMessageService();
const tenantBillingAutomationService = new TenantBillingAutomationService();
const billingAutomationPreviewService = new BillingAutomationPreviewService();
const billingJobRunService = new BillingJobRunService();
const invoicesService = new InvoicesService();
const invoiceChargeService = new InvoiceChargeService();
const paymentsService = new PaymentsService();
const paymentWebhookLogService = new PaymentWebhookLogService();

export async function tenantBillingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/settings', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return tenantSettings.get(tenantId);
  });

  app.patch('/settings', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = request.body as Record<string, unknown>;
    try {
      return await tenantSettings.update(tenantId, {
        paymentProvider: body.paymentProvider as 'asaas' | 'efi' | 'mercadopago' | undefined,
        paymentApiKey: body.paymentApiKey as string | undefined,
        paymentWebhookToken: body.paymentWebhookToken as string | undefined,
        whatsappProvider: body.whatsappProvider as 'evolution' | 'meta' | undefined,
        whatsappInstanceUrl: body.whatsappInstanceUrl as string | undefined,
        whatsappApiKey: body.whatsappApiKey as string | undefined,
      });
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/settings/webhook-logs', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return paymentWebhookLogService.listForTenant(tenantId, 50);
  });

  app.get('/settings/charge-messages', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return tenantChargeMessageService.get(tenantId);
  });

  app.patch('/settings/charge-messages', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const parsed = tenantChargeMessagesSettingsSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return tenantChargeMessageService.update(tenantId, parsed.data);
  });

  app.get('/settings/billing-automation', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return tenantBillingAutomationService.get(tenantId);
  });

  app.patch('/settings/billing-automation', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const parsed = billingAutomationSettingsSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return tenantBillingAutomationService.update(tenantId, parsed.data);
  });

  app.get('/settings/billing-automation/last-run', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return billingAutomationPreviewService.getLastRun(tenantId);
  });

  app.get('/settings/billing-automation/preview', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { scenario } = request.query as { scenario?: 'current' | 'next_scheduled_run' };
    return billingAutomationPreviewService.getPreview(tenantId, { scenario });
  });

  app.get('/settings/billing-automation/scheduler-meta', async () =>
    getBillingAutomationSchedulerMeta(),
  );

  app.get('/settings/billing-automation/global-last-run', async () =>
    billingJobRunService.getLastGlobalRun(),
  );

  app.get('/customers/:customerId/invoices', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { customerId } = request.params as { customerId: string };
    const { page, pageSize } = request.query as { page?: string; pageSize?: string };

    return invoicesService.list(
      'tenant',
      tenantId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      '',
      { customerId },
    );
  });

  app.get('/settings/subscription', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return tenantSettings.getSubscription(tenantId);
  });

  app.get('/settings/payment-credentials', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return tenantPaymentSettings.listCredentials(tenantId);
  });

  app.put('/settings/payment-credentials', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    try {
      return await tenantPaymentSettings.updateCredentials(tenantId, request.body);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/settings/payment-routing', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return tenantPaymentSettings.listRoutingRules(tenantId);
  });

  app.put('/settings/payment-routing', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    try {
      return await tenantPaymentSettings.updateRoutingRules(tenantId, request.body);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/settings/payment-routing/preview', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { amountCents } = request.query as { amountCents?: string };
    const cents = parseInt(amountCents || '0', 10);
    try {
      return await tenantPaymentSettings.previewRouting(tenantId, cents);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/invoices', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { page, pageSize, filter } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
    };
    const listFilters = pickListFilters(request.query as Record<string, unknown>, INVOICE_LIST_FILTER_KEYS);
    return invoicesService.list(
      'tenant',
      tenantId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
      listFilters,
    );
  });

  app.post('/invoices', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const parsed = createManualInvoiceSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    try {
      return await invoicesService.createManual(tenantId, parsed.data, resolveActorUserId(request));
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.get('/payments', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { page, pageSize } = request.query as { page?: string; pageSize?: string };
    const listFilters = pickListFilters(request.query as Record<string, unknown>, PAYMENT_LIST_FILTER_KEYS);
    return paymentsService.list(
      'tenant',
      tenantId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      listFilters,
    );
  });

  app.get('/invoices/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const invoice = await invoicesService.getById('tenant', id, tenantId);
    if (!invoice) {
      return sendNotFound(reply, 'Fatura não encontrada');
    }
    return invoice;
  });

  app.post('/invoices/:id/cancel', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string };
    try {
      return await invoicesService.cancel('tenant', id, tenantId, body.reason);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.post('/invoices/:id/recreate', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = request.body as { amountCents: number; dueDate: string };
    try {
      return await invoicesService.recreate('tenant', id, tenantId, body);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.get('/payments/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const payment = await paymentsService.getById('tenant', id, tenantId);
    if (!payment) {
      return sendNotFound(reply, 'Pagamento não encontrado');
    }
    return payment;
  });

  app.post('/invoices/:id/generate-pix', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    try {
      return await invoicesService.generatePayment(id, tenantId);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.patch('/invoices/:id/charge-messages', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const parsed = updateInvoiceChargeMessagesSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }
    try {
      return await invoicesService.updateChargeMessages('tenant', id, tenantId, parsed.data);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.post('/invoices/:id/send-charge', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    try {
      return await invoiceChargeService.sendChargeViaWhatsApp(
        id,
        tenantId,
        'manual',
        resolveActorUserId(request),
      );
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.post('/invoices/:id/mark-paid', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { method?: string; notes?: string; paidAt?: string };
    try {
      return await invoicesService.markPaidManual(id, tenantId, {
        ...body,
        accountUserId: resolveActorUserId(request),
      });
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/invoices/:id/register-payment', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };

    const parsed = registerPaymentSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    try {
      return await invoicesService.markPaidManual(id, tenantId, {
        method: parsed.data.method,
        notes: parsed.data.notes,
        paidAt: parsed.data.paidAt,
        accountUserId: resolveActorUserId(request),
      });
    } catch (error) {
      return sendApiError(reply, error);
    }
  });
}
