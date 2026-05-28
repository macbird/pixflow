import { prisma } from '../../core/database';

export class TenantsService {
  async list() {
    return await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async create(input: { name: string, slug: string }) {
    return await prisma.account.create({
      data: {
        name: input.name,
        slug: input.slug,
        status: 'active',
      },
    });
  }

  async toggleStatus(id: string, status: 'active' | 'suspended') {
    return await prisma.account.update({
      where: { id },
      data: {
        status: status === 'active' ? 'active' : 'suspended',
      },
    });
  }
}
