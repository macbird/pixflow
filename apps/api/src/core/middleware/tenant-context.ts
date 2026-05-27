import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
    userId?: string;
    role?: string;
  }
}

export async function tenantContextMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (request.user) {
    const user = request.user as any;
    request.tenantId = user.tenantId;
    request.userId = user.sub;
    request.role = user.role;
  }
}
