import { prisma } from '../../core/database';
import { ServerInput } from '@iptv-manager/shared';

export class ServersService {
  async list(tenantId: string) {
    return await prisma.server.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, input: ServerInput) {
    return await prisma.server.create({
      data: {
        ...input,
        tenantId,
      },
    });
  }

  async update(tenantId: string, id: string, input: ServerInput) {
    await prisma.server.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.server.update({
      where: { id },
      data: input,
    });
  }

  async delete(tenantId: string, id: string) {
    await prisma.server.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.server.delete({
      where: { id },
    });
  }
}
