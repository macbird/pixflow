import { prisma } from '../../core/database';
import argon2 from 'argon2';
import { RegisterInput } from '@iptv-manager/shared';
import slugify from 'slugify';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.accountUser.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await argon2.hash(input.password);
    const slug = slugify(input.accountName, { lower: true });

    // Handle slug collision (basic version)
    let finalSlug = slug;
    const existingAccount = await prisma.account.findUnique({
      where: { slug },
    });
    
    if (existingAccount) {
      finalSlug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    return await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: input.accountName,
          slug: finalSlug,
          phone: input.phone,
          status: 'active',
        },
      });

      const user = await tx.accountUser.create({
        data: {
          accountId: account.id,
          email: input.email,
          passwordHash,
          name: input.userName,
          role: 'tenant_owner',
        },
      });

      return { account, user };
    });
  }

  async login(email: string, password: string) {
    const user = await prisma.accountUser.findUnique({
      where: { email },
      include: { account: true },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await argon2.verify(user.passwordHash, password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return user;
  }
}
