import { FastifyInstance } from 'fastify';
import {
  createTenantAccountSchema,
  updateTenantAccountSchema,
} from '@client-manager/shared';
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

  app.post('/', async (request, reply) => {
    const parsed = createTenantAccountSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? 'Invalid payload' });
    }
    try {
      return await tenantsService.create(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta';
      return reply.status(400).send({ message });
    }
  });

  app.post('/reset-password', async (request) => {
    const { email, newPassword } = request.body as { email: string; newPassword?: string };
    return await tenantsService.resetPassword(email, newPassword);
  });

  app.post('/:id/invoices', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await tenantsService.generatePlatformInvoice(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao gerar fatura';
      const status = message.includes('Já existe') ? 409 : message.includes('not found') ? 404 : 400;
      return reply.status(status).send({ message });
    }
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const account = await tenantsService.findById(id);
    if (!account) {
      return reply.status(404).send({ message: 'Account not found' });
    }
    return account;
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTenantAccountSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? 'Invalid payload' });
    }
    try {
      return await tenantsService.update(id, parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar conta';
      return reply.status(error instanceof Error && error.message === 'Account not found' ? 404 : 400).send({
        message,
      });
    }
  });

  app.patch('/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'active' | 'suspended' };
    return await tenantsService.toggleStatus(id, status);
  });
}
