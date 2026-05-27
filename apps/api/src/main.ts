import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { registerAuthModule } from './modules/auth';
import { registerPlansModule } from './modules/plans';
import { registerServersModule } from './modules/servers';
import { registerTagsModule } from './modules/tags';
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
        await tenantContextMiddleware(request, reply);
      } catch (err) {
        reply.send(err);
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
    await app.register(registerTagsModule, { prefix: '/api/tags' });

    const port = Number(process.env.PORT) || 3001;

    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
