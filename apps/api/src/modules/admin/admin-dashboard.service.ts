import { prisma } from '../../core/database';
import {
  getBillingSnapshot,
  getMonthlyBillingTrend,
} from '../billing/billing-dashboard.util';

export class AdminDashboardService {
  async getStats() {
    const [
      totalAccounts,
      activeAccounts,
      totalUsers,
      billing,
      monthlyBilling,
      recentPayments,
      health,
    ] = await Promise.all([
      prisma.account.count(),
      prisma.account.count({ where: { status: 'active' } }),
      prisma.accountUser.count(),
      getBillingSnapshot('platform'),
      getMonthlyBillingTrend('platform'),
      this.getRecentPayments(5),
      this.getOperationalHealth(),
    ]);

    const activeSubscriptionsRows = await prisma.accountSubscription.findMany({
      where: {
        status: 'active',
        account: { status: 'active' },
      },
      select: {
        platformPlan: {
          select: { priceCents: true },
        },
      },
    });
    const activeSubscriptions = activeSubscriptionsRows.length;
    const expectedMrrCents = activeSubscriptionsRows.reduce(
      (sum, row) => sum + row.platformPlan.priceCents,
      0,
    );

    return {
      totalAccounts,
      activeAccounts,
      inactiveAccounts: totalAccounts - activeAccounts,
      totalUsers,
      expectedMrrCents,
      activeSubscriptions,
      billing,
      monthlyBilling,
      recentPayments,
      health,
    };
  }

  /**
   * Returns platform and tenant configuration health indicators for the admin dashboard.
   */
  async getOperationalHealth() {
    const [platformPayment, platformWhatsapp, activeTenantsWithoutMercadoPago, activeTenantsWithoutPhone] =
      await Promise.all([
        prisma.platformPaymentConfig.findUnique({
          where: { id: 'default' },
          select: { apiKey: true },
        }),
        prisma.platformWhatsappConfig.findUnique({
          where: { id: 'default' },
          select: { connectionStatus: true },
        }),
        prisma.account.count({
          where: {
            status: 'active',
            NOT: {
              tenantPaymentCredentials: {
                some: { active: true, apiKey: { not: null } },
              },
            },
          },
        }),
        prisma.account.count({
          where: {
            status: 'active',
            OR: [{ phone: null }, { phone: '' }],
          },
        }),
      ]);

    return {
      platformMercadoPagoConfigured: Boolean(platformPayment?.apiKey),
      platformWhatsappConnected: platformWhatsapp?.connectionStatus === 'connected',
      activeTenantsWithoutMercadoPago,
      activeTenantsWithoutPhone,
    };
  }

  async getRecentPayments(limit = 5) {
    const rows = await prisma.payment.findMany({
      where: { invoice: { scope: 'platform' } },
      orderBy: { paidAt: 'desc' },
      take: limit,
      include: {
        invoice: {
          select: {
            billingCycleKey: true,
            account: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      accountName: p.invoice.account.name,
      billingCycleKey: p.invoice.billingCycleKey,
    }));
  }
}
