import { FastifyInstance } from 'fastify';
import { requireTenantId } from '../../core/middleware/require-tenant';
import { TenantSettingsService } from './tenant-settings.service';
import { TenantPaymentSettingsService } from './tenant-payment-settings.service';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { handleInvoiceActionError } from './invoice-route.util';
import { pickListFilters } from '../../core/utils/parse-list-filters';

const INVOICE_LIST_FILTER_KEYS = ['status', 'billingCycleKey', 'dueFrom', 'dueTo'] as const;
const PAYMENT_LIST_FILTER_KEYS = ['method', 'billingCycleKey', 'paidFrom', 'paidTo'] as const;

const tenantSettings = new TenantSettingsService();
const tenantPaymentSettings = new TenantPaymentSettingsService();
const invoicesService = new InvoicesService();
const paymentsService = new PaymentsService();

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
    return tenantSettings.update(tenantId, {
      paymentProvider: body.paymentProvider as 'asaas' | 'efi' | 'mercadopago' | undefined,
      paymentApiKey: body.paymentApiKey as string | undefined,
      paymentWebhookToken: body.paymentWebhookToken as string | undefined,
      whatsappProvider: body.whatsappProvider as 'evolution' | 'meta' | undefined,
      whatsappInstanceUrl: body.whatsappInstanceUrl as string | undefined,
      whatsappApiKey: body.whatsappApiKey as string | undefined,
    });
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
      return reply.status(400).send({ message: (error as Error).message });
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
      return reply.status(400).send({ message: (error as Error).message });
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
      return reply.status(400).send({ message: (error as Error).message });
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
      return reply.status(404).send({ message: 'Invoice not found' });
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
      return reply.status(404).send({ message: 'Payment not found' });
    }
    return payment;
  });

  app.post('/invoices/:id/generate-pix', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    try {
      return await invoicesService.generatePixStub(id, tenantId);
    } catch {
      return reply.status(404).send({ message: 'Invoice not found' });
    }
  });

  app.post('/invoices/:id/mark-paid', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    try {
      return await invoicesService.markPaidManual(id, tenantId);
    } catch {
      return reply.status(404).send({ message: 'Invoice not found' });
    }
  });
}
