import './load-env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { registerAuthModule } from './modules/auth';
import { registerPlansModule } from './modules/plans';
import { registerServersModule } from './modules/servers';
import { registerCustomersModule } from './modules/customers';
import { registerTagsModule } from './modules/tags';
import { registerDashboardModule } from './modules/dashboard';
import { registerAdminModule } from './modules/admin';
import { registerBillingModule } from './modules/billing';
import { paymentWebhookRoutes } from './modules/billing/payment-webhook.routes';
import { registerActivationsModule } from './modules/activations';
import { tenantContextMiddleware } from './core/middleware/tenant-context';

const app = Fastify({
  logger: true,
});

const start = async () => {
  try {
    await app.register(cors, {
      origin: true,
    });

    await app.register(jwt, {
      secret: process.env.JWT_SECRET || 'supersecret',
    });

    app.decorate("authenticate", async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
        const user = request.user as any;
        if (user.type !== 'tenant_user' && user.type !== 'platform_admin') {
          throw new Error('Unauthorized');
        }
        if (user.type === 'tenant_user') {
          await tenantContextMiddleware(request, reply);
        }
      } catch (err) {
        reply.status(401).send({ message: 'Unauthorized' });
      }
    });

    app.decorate("authenticateAdmin", async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
        const user = request.user as any;
        if (user.type !== 'platform_admin') {
          throw new Error('Unauthorized');
        }
      } catch (err) {
        reply.status(401).send({ message: 'Unauthorized' });
      }
    });

    // Health check
    app.get('/health', async () => {
      return { status: 'ok' };
    });

    // Register modules
    await app.register(registerAuthModule, { prefix: '/api/auth' });
    await app.register(registerPlansModule, { prefix: '/api/plans' });
    await app.register(registerServersModule, { prefix: '/api/servers' });
    await app.register(registerCustomersModule, { prefix: '/api/customers' });
    await app.register(registerTagsModule, { prefix: '/api/tags' });
    await app.register(registerDashboardModule, { prefix: '/api/dashboard' });
    await app.register(registerAdminModule, { prefix: '/api/admin' });
    await registerBillingModule(app);
    await app.register(paymentWebhookRoutes, { prefix: '/api/webhooks' });
    await registerActivationsModule(app);

    const port = Number(process.env.PORT) || 3001;

    await app.listen({ port, host: '0.0.0.0' });
    console.log('Registered routes:', app.printRoutes());
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
