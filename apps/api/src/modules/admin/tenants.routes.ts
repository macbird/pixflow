import { FastifyInstance } from 'fastify';
import { TenantsService } from './tenants.service';

const tenantsService = new TenantsService();

export async function tenantsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/', async (request) => {
    const { page, pageSize, filter } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
    };
    return await tenantsService.list(
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
    );
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const account = await tenantsService.findById(id);
    if (!account) {
      return reply.status(404).send({ message: 'Account not found' });
    }
    return account;
  });

  app.post('/', async (request) => {
    const data = request.body as { name: string, slug?: string, ownerEmail: string, ownerName: string, initialPassword?: string };
    return await tenantsService.create(data);
  });

  app.post('/reset-password', async (request) => {
    const { email, newPassword } = request.body as { email: string, newPassword?: string };
    return await tenantsService.resetPassword(email, newPassword);
  });

  app.patch('/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'active' | 'suspended' };
    return await tenantsService.toggleStatus(id, status);
  });
}
