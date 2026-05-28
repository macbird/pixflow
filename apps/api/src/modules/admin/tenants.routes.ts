import { FastifyInstance } from 'fastify';
import { TenantsService } from './tenants.service';

const tenantsService = new TenantsService();

export async function tenantsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/', async () => {
    return await tenantsService.list();
  });

  app.post('/', async (request) => {
    const data = request.body as { name: string, slug: string };
    return await tenantsService.create(data);
  });

  app.patch('/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'active' | 'inactive' };
    return await tenantsService.toggleStatus(id, status);
  });
}
