import { FastifyInstance } from 'fastify';
import { CustomersService } from './customers.service';
import { customerSchema } from '@client-manager/shared';
import { requireTenantId } from '../../core/middleware/require-tenant';

const customersService = new CustomersService();

export async function customersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { page, pageSize, filter } = request.query as {
      page?: string;
      pageSize?: string;
      filter?: string;
    };
    return await customersService.list(
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
    const customer = await customersService.findById(tenantId, id);
    if (!customer) {
      return reply.status(404).send({ message: 'Customer not found' });
    }
    return customer;
  });

  app.post('/', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const body = request.body as Record<string, unknown>;
    const data = customerSchema.parse(body);
    return await customersService.create(tenantId, { ...data, tagIds: body.tagIds as string[] | undefined });
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const data = customerSchema.parse(body);
    return await customersService.update(tenantId, id, {
      ...data,
      tagIds: body.tagIds as string[] | undefined,
    });
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    return await customersService.delete(tenantId, id);
  });
}
