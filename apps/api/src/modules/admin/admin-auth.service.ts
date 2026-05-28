import { prisma } from '../../core/database';
import argon2 from 'argon2';

export class AdminAuthService {
  async login(email: string, password: string) {
    const admin = await prisma.platformAdmin.findUnique({ where: { email } });
    if (!admin) throw new Error('Invalid credentials');
    
    if (!(await argon2.verify(admin.password, password))) {
        throw new Error('Invalid credentials');
    }
    return admin;
  }
}
