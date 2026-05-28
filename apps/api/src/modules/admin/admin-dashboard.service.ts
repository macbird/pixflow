import { prisma } from '../../core/database';

export class AdminDashboardService {
  async getStats() {
    const [totalAccounts, activeAccounts, totalUsers] = await Promise.all([
      prisma.account.count(),
      prisma.account.count({ where: { status: 'active' } }),
      prisma.accountUser.count(),
    ]);

    return {
      totalAccounts,
      activeAccounts,
      suspendedAccounts: totalAccounts - activeAccounts,
      totalUsers,
    };
  }
}
