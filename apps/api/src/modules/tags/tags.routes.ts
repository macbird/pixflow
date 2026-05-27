import { FastifyInstance } from 'fastify';
import { TagsService } from './tags.service';
import { tagSchema } from '@iptv-manager/shared';

const tagsService = new TagsService();

export async function tagsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    return await tagsService.list(request.tenantId!);
  });

  app.post('/', async (request) => {
    const data = tagSchema.parse(request.body);
    return await tagsService.create(request.tenantId!, data);
  });

  app.put('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = tagSchema.parse(request.body);
    return await tagsService.update(request.tenantId!, id, data);
  });

  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return await tagsService.delete(request.tenantId!, id);
  });
}
