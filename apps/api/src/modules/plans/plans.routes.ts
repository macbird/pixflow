import { FastifyInstance } from 'fastify';
import { PlansService } from './plans.service';
import { planSchema } from '@client-manager/shared';
import { requireTenantId } from '../../core/middleware/require-tenant';
import { pickListFilters } from '../../core/utils/parse-list-filters';

const PLAN_LIST_FILTER_KEYS = ['status', 'billingCycle', 'minPrice', 'maxPrice'] as const;

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
    const listFilters = pickListFilters(request.query as Record<string, unknown>, PLAN_LIST_FILTER_KEYS);
    return await plansService.list(
      tenantId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '10', 10),
      filter || '',
      listFilters,
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

    const parsed = planSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        message: parsed.error.errors[0]?.message ?? 'Dados do plano inválidos',
      });
    }
    return await plansService.create(tenantId, parsed.data);
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const parsed = planSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        message: parsed.error.errors[0]?.message ?? 'Dados do plano inválidos',
      });
    }
    await plansService.update(tenantId, id, parsed.data);
    return reply.status(204).send();
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    return await plansService.delete(tenantId, id);
  });
}
