import { FastifyInstance } from 'fastify';
import { PlatformSettingsService } from './platform-settings.service';
import { InvoicesService } from './invoices.service';
import { InvoiceChargeService } from './invoice-charge.service';
import { PaymentsService } from './payments.service';
import { handleInvoiceActionError } from './invoice-route.util';
import { pickListFilters } from '../../core/utils/parse-list-filters';

const INVOICE_LIST_FILTER_KEYS = ['status', 'billingCycleKey', 'dueFrom', 'dueTo'] as const;
const PAYMENT_LIST_FILTER_KEYS = ['method', 'billingCycleKey', 'paidFrom', 'paidTo'] as const;

const platformSettings = new PlatformSettingsService();
const invoicesService = new InvoicesService();
const invoiceChargeService = new InvoiceChargeService();
const paymentsService = new PaymentsService();

export async function platformBillingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/platform-settings', async () => platformSettings.get());

  app.patch('/platform-settings', async (request) => {
    const body = request.body as Record<string, unknown>;
    return platformSettings.update({
      planName: body.planName as string | undefined,
      priceCents: body.priceCents !== undefined ? Number(body.priceCents) : undefined,
      paymentProvider: body.paymentProvider as 'asaas' | 'efi' | 'mercadopago' | undefined,
      paymentApiKey: body.paymentApiKey as string | undefined,
      paymentWebhookToken: body.paymentWebhookToken as string | undefined,
      overdueDays: body.overdueDays !== undefined ? Number(body.overdueDays) : undefined,
      whatsappProvider: body.whatsappProvider as 'evolution' | 'meta' | undefined,
      whatsappInstanceUrl: body.whatsappInstanceUrl as string | undefined,
      whatsappApiKey: body.whatsappApiKey as string | undefined,
    });
  });

  app.get('/invoices', async (request) => {
    const { page, pageSize, filter } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
    };
    const listFilters = pickListFilters(request.query as Record<string, unknown>, INVOICE_LIST_FILTER_KEYS);
    return invoicesService.list(
      'platform',
      null,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
      listFilters,
    );
  });

  app.get('/payments', async (request) => {
    const { page, pageSize } = request.query as { page?: string; pageSize?: string };
    const listFilters = pickListFilters(request.query as Record<string, unknown>, PAYMENT_LIST_FILTER_KEYS);
    return paymentsService.list(
      'platform',
      null,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      listFilters,
    );
  });

  app.get('/invoices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await invoicesService.getById('platform', id, null);
    if (!invoice) {
      return reply.status(404).send({ message: 'Invoice not found' });
    }
    return invoice;
  });

  app.post('/invoices/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason?: string };
    try {
      return await invoicesService.cancel('platform', id, null, body.reason);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.post('/invoices/:id/recreate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { amountCents: number; dueDate: string };
    try {
      return await invoicesService.recreate('platform', id, null, body);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.get('/payments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const payment = await paymentsService.getById('platform', id, null);
    if (!payment) {
      return reply.status(404).send({ message: 'Payment not found' });
    }
    return payment;
  });

  app.post('/invoices/:id/generate-pix', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await invoicesService.generatePayment(id);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.post('/invoices/:id/send-charge', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await invoiceChargeService.sendChargeViaWhatsApp(id);
    } catch (error) {
      return handleInvoiceActionError(reply, error);
    }
  });

  app.post('/invoices/:id/mark-paid', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await invoicesService.markPaidManual(id);
    } catch {
      return reply.status(404).send({ message: 'Invoice not found' });
    }
  });
}
