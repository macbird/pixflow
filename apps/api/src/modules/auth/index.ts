import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes';

export async function registerAuthModule(app: FastifyInstance) {
  app.register(authRoutes);
}
