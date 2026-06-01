import { prisma } from '../../core/database';
import argon2 from 'argon2';
import slugify from 'slugify';

const accountListInclude = {
  users: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordResetRequired: true,
    },
  },
} as const;

export class TenantsService {
  async list(page: number, pageSize: number, filter: string) {
    const skip = (page - 1) * pageSize;
    const trimmed = filter.trim();
    const where = trimmed
      ? {
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' as const } },
            { slug: { contains: trimmed, mode: 'insensitive' as const } },
            {
              users: {
                some: {
                  OR: [
                    { name: { contains: trimmed, mode: 'insensitive' as const } },
                    { email: { contains: trimmed, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: accountListInclude,
      }),
      prisma.account.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return await prisma.account.findUnique({
      where: { id },
      include: accountListInclude,
    });
  }

  async create(input: { name: string, slug?: string, ownerEmail: string, ownerName: string, initialPassword?: string }) {
    const slug = input.slug || slugify(input.name, { lower: true });
    const initialPassword = input.initialPassword || 'Mudar123!';
    const passwordHash = await argon2.hash(initialPassword);

    return await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: input.name,
          slug,
          status: 'active',
        },
      });

      await tx.accountUser.create({
        data: {
          accountId: account.id,
          email: input.ownerEmail,
          name: input.ownerName,
          passwordHash,
          role: 'tenant_owner',
          passwordResetRequired: true,
        },
      });

      return account;
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

  async resetPassword(email: string, newPassword?: string) {
    const password = newPassword || 'Reset123!';
    const passwordHash = await argon2.hash(password);

    const user = await prisma.accountUser.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return await prisma.accountUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetRequired: true,
      },
    });
  }
}
