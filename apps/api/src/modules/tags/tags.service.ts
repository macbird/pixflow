import { prisma } from '../../core/database';
import { TagInput } from '@iptv-manager/shared';

export class TagsService {
  async list(tenantId: string) {
    return await prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, input: TagInput) {
    return await prisma.tag.create({
      data: {
        ...input,
        tenantId,
      },
    });
  }

  async update(tenantId: string, id: string, input: TagInput) {
    await prisma.tag.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.tag.update({
      where: { id },
      data: input,
    });
  }

  async delete(tenantId: string, id: string) {
    await prisma.tag.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.tag.delete({
      where: { id },
    });
  }
}
