import { FastifyInstance } from 'fastify';
import { serversRoutes } from './servers.routes';

export async function registerServersModule(app: FastifyInstance) {
  app.register(serversRoutes);
}
