import { FastifyInstance } from 'fastify';
import { plansRoutes } from './plans.routes';

export async function registerPlansModule(app: FastifyInstance) {
  app.register(plansRoutes);
}
