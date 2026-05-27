import { FastifyInstance } from 'fastify';
import { ServersService } from './servers.service';
import { serverSchema } from '@iptv-manager/shared';

const serversService = new ServersService();

export async function serversRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    return await serversService.list(request.tenantId!);
  });

  app.post('/', async (request) => {
    const data = serverSchema.parse(request.body);
    return await serversService.create(request.tenantId!, data);
  });

  app.put('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = serverSchema.parse(request.body);
    return await serversService.update(request.tenantId!, id, data);
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return await serversService.delete(request.tenantId!, id);
  });
}
