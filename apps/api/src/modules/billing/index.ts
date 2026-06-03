import { FastifyInstance } from 'fastify';
import { platformBillingRoutes } from './platform-billing.routes';
import { tenantBillingRoutes } from './tenant-billing.routes';

export async function registerBillingModule(app: FastifyInstance) {
  await app.register(tenantBillingRoutes, { prefix: '/api' });
}

export async function registerPlatformBillingModule(app: FastifyInstance) {
  await app.register(platformBillingRoutes);
}
