import type { PaymentProviderType } from '@prisma/client';
import {
  DEFAULT_PAYMENT_ROUTING_RULES,
  resolvePaymentProvider,
  type PaymentRoutingRuleInput,
} from '@client-manager/shared';
import { prisma } from '../../core/database';

export class PaymentRouterService {
  /**
   * Resolves the payment provider for a tenant invoice using persisted routing rules.
   * Falls back to {@link DEFAULT_PAYMENT_ROUTING_RULES} when none are configured.
   */
  async resolveForTenant(accountId: string, amountCents: number): Promise<PaymentProviderType> {
    const rules = await this.getRulesForTenant(accountId);
    return resolvePaymentProvider(rules, amountCents) as PaymentProviderType;
  }

  /**
   * Returns active routing rules for a tenant, or defaults when the table is empty.
   */
  async getRulesForTenant(accountId: string): Promise<PaymentRoutingRuleInput[]> {
    const rows = await prisma.tenantPaymentRoutingRule.findMany({
      where: { accountId, active: true },
      orderBy: [{ minAmountCents: 'desc' }, { sortOrder: 'asc' }],
    });

    if (rows.length === 0) {
      return DEFAULT_PAYMENT_ROUTING_RULES;
    }

    return rows.map((row) => ({
      minAmountCents: row.minAmountCents,
      provider: row.provider,
      active: row.active,
    }));
  }

  /**
   * Resolves provider from an in-memory rule set (used by preview endpoint and tests).
   */
  resolveProvider(rules: PaymentRoutingRuleInput[], amountCents: number): PaymentProviderType {
    return resolvePaymentProvider(rules, amountCents) as PaymentProviderType;
  }
}
