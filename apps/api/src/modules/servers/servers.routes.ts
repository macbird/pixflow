import { FastifyInstance } from 'fastify';
import { ServersService } from './servers.service';
import { serverSchema } from '@client-manager/shared';
import { requireTenantId } from '../../core/middleware/require-tenant';

const serversService = new ServersService();

export async function serversRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { page, pageSize, filter } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
    };
    return await serversService.list(
      tenantId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
    );
  });

  app.post('/', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const data = serverSchema.parse(body);
    return await serversService.create(tenantId, { ...data, tagIds: body.tagIds });
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const data = serverSchema.parse(body);
    return await serversService.update(tenantId, id, { ...data, tagIds: body.tagIds });
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    return await serversService.delete(tenantId, id);
  });
}
