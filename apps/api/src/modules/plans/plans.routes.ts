import { FastifyInstance } from 'fastify';
import { PlansService } from './plans.service';
import { planSchema } from '@iptv-manager/shared';

const plansService = new PlansService();

export async function plansRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    return await plansService.list(request.tenantId!);
  });

  app.post('/', async (request, reply) => {
    const data = planSchema.parse(request.body);
    return await plansService.create(request.tenantId!, data);
  });

  app.put('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = planSchema.parse(request.body);
    return await plansService.update(request.tenantId!, id, data);
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return await plansService.delete(request.tenantId!, id);
  });
}
