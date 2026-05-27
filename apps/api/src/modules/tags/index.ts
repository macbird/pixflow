import { FastifyInstance } from 'fastify';
import { tagsRoutes } from './tags.routes';

export async function registerTagsModule(app: FastifyInstance) {
  app.register(tagsRoutes);
}
