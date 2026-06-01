import { FastifyInstance } from 'fastify';
import { PlansService } from './plans.service';
import { planSchema } from '@client-manager/shared';
import { requireTenantId } from '../../core/middleware/require-tenant';

const plansService = new PlansService();

export async function plansRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { page, pageSize, filter } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
    };
    return await plansService.list(
      tenantId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
    );
  });

  app.get('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const plan = await plansService.findById(tenantId, id);
    if (!plan) {
      return reply.status(404).send({ message: 'Plan not found' });
    }
    return plan;
  });

  app.post('', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const data = planSchema.parse(request.body);
    return await plansService.create(tenantId, data);
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const data = planSchema.parse(request.body);
    await plansService.update(tenantId, id, data);
    return reply.status(204).send();
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    return await plansService.delete(tenantId, id);
  });
}
