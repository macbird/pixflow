import { prisma } from '../../core/database';
import { PlanInput } from '@iptv-manager/shared';

export class PlansService {
  async list(tenantId: string) {
    return await prisma.plan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, input: PlanInput) {
    return await prisma.plan.create({
      data: {
        ...input,
        tenantId,
      },
    });
  }

  async update(tenantId: string, id: string, input: PlanInput) {
    // Ensure it belongs to the tenant
    await prisma.plan.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.plan.update({
      where: { id },
      data: input,
    });
  }

  async delete(tenantId: string, id: string) {
    await prisma.plan.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.plan.delete({
      where: { id },
    });
  }
}
