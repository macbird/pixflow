import type { FastifyInstance } from 'fastify';
import { PaymentWebhookService } from './payment-webhook.service';

const paymentWebhookService = new PaymentWebhookService();

/**
 * Public webhook routes for PSP payment notifications.
 */
export async function paymentWebhookRoutes(app: FastifyInstance) {
  app.post('/payment/:tenantSlug/mercadopago', async (request, reply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };
    const token = (request.query as { token?: string }).token;

    try {
      const result = await paymentWebhookService.handleMercadoPago({
        tenantSlug,
        body: request.body,
        query: request.query as Record<string, unknown>,
        token,
      });
      return reply.status(200).send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      const status = message.includes('not found') || message.includes('Invalid webhook') ? 401 : 400;
      return reply.status(status).send({ ok: false, message });
    }
  });

  app.get('/payment/:tenantSlug/mercadopago', async (request, reply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };
    const token = (request.query as { token?: string }).token;

    try {
      const result = await paymentWebhookService.handleMercadoPago({
        tenantSlug,
        body: null,
        query: request.query as Record<string, unknown>,
        token,
      });
      return reply.status(200).send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      const status = message.includes('not found') || message.includes('Invalid webhook') ? 401 : 400;
      return reply.status(status).send({ ok: false, message });
    }
  });
}
