import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema } from '@iptv-manager/shared';

const authService = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await authService.register(data);
      
      const token = app.jwt.sign({
        sub: result.user.id,
        tenantId: result.account.id,
        role: result.user.role,
      });

      return { 
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        account: {
          id: result.account.id,
          name: result.account.name,
          slug: result.account.slug,
        },
        token 
      };
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({ message: 'Validation error', errors: err.errors });
      }
      return reply.status(400).send({ message: err.message });
    }
  });

  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const user = await authService.login(email, password);

      const token = app.jwt.sign({
        sub: user.id,
        tenantId: user.accountId,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        account: {
          id: user.account.id,
          name: user.account.name,
          slug: user.account.slug,
        },
        token
      };
    } catch (err: any) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    return request.user;
  });
}

// Add decorator to Fastify for authentication
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}
