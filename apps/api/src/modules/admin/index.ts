import { FastifyInstance } from 'fastify';
import { adminAuthRoutes } from './admin-auth.routes';
import { tenantsRoutes } from './tenants.routes';
import { adminDashboardRoutes } from './admin-dashboard.routes';

export async function registerAdminModule(app: FastifyInstance) {
  app.register(adminAuthRoutes, { prefix: '/auth' });
  app.register(tenantsRoutes, { prefix: '/tenants' });
  app.register(adminDashboardRoutes, { prefix: '/dashboard' });
}
