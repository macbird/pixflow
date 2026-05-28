import { FastifyInstance } from 'fastify';
import { AdminDashboardService } from './admin-dashboard.service';

const dashboardService = new AdminDashboardService();

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/', async () => {
    return await dashboardService.getStats();
  });
}
