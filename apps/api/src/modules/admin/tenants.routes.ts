import { FastifyInstance } from 'fastify';
import {
  createTenantAccountSchema,
  updateTenantAccountSchema,
} from '@client-manager/shared';
import { sendApiError, sendNotFound, sendValidationError } from '../../core/errors/send-api-error';
import { TenantsService } from './tenants.service';

const tenantsService = new TenantsService();

export async function tenantsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/', async (request) => {
    const { page, pageSize, filter, status } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
      status?: string;
    };
    return await tenantsService.list(
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
      status,
    );
  });

  app.post('/', async (request, reply) => {
    const parsed = createTenantAccountSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }
    try {
      return await tenantsService.create(parsed.data);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/reset-password', async (request, reply) => {
    const { email, newPassword } = request.body as { email: string; newPassword?: string };
    try {
      return await tenantsService.resetPassword(email, newPassword);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/:id/invoices', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await tenantsService.generatePlatformInvoice(id);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const account = await tenantsService.findById(id);
    if (!account) {
      return sendNotFound(reply, 'Conta não encontrada');
    }
    return account;
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTenantAccountSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }
    try {
      return await tenantsService.update(id, parsed.data);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.patch('/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'active' | 'inactive' };
    return await tenantsService.toggleStatus(id, status);
  });
}
