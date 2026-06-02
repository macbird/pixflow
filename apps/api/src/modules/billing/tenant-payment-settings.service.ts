import { prisma } from '../../core/database';
import type { PaymentProviderType } from '@prisma/client';
import {
  DEFAULT_PAYMENT_ROUTING_RULES,
  updateTenantPaymentCredentialsSchema,
  updateTenantPaymentRoutingSchema,
  type PaymentRoutingRuleInput,
  type TenantPaymentCredentialDto,
  type TenantPaymentRoutingRuleDto,
} from '@client-manager/shared';
import { PaymentRouterService } from '../../integrations/payment/payment-router.service';

const paymentRouter = new PaymentRouterService();

function mapCredential(row: {
  provider: PaymentProviderType;
  apiKey: string | null;
  webhookToken: string | null;
  active: boolean;
}): TenantPaymentCredentialDto {
  return {
    provider: row.provider,
    apiKeyConfigured: Boolean(row.apiKey),
    webhookTokenConfigured: Boolean(row.webhookToken),
    active: row.active,
  };
}

function mapRoutingRule(row: {
  id: string;
  minAmountCents: number;
  provider: PaymentProviderType;
  sortOrder: number;
  active: boolean;
}): TenantPaymentRoutingRuleDto {
  return {
    id: row.id,
    minAmountCents: row.minAmountCents,
    provider: row.provider,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

export class TenantPaymentSettingsService {
  /**
   * Lists configured PSP credentials for a tenant.
   */
  async listCredentials(tenantId: string): Promise<TenantPaymentCredentialDto[]> {
    await this.ensureLegacyCredentialMigrated(tenantId);

    const rows = await prisma.tenantPaymentCredential.findMany({
      where: { accountId: tenantId },
      orderBy: { provider: 'asc' },
    });

    return rows.map(mapCredential);
  }

  /**
   * Upserts PSP credentials for a tenant (one row per provider).
   */
  async updateCredentials(
    tenantId: string,
    payload: unknown,
  ): Promise<TenantPaymentCredentialDto[]> {
    const parsed = updateTenantPaymentCredentialsSchema.parse(payload);

    for (const item of parsed.credentials) {
      const update: Record<string, unknown> = {
        accountId: tenantId,
        provider: item.provider,
        active: item.active ?? true,
      };
      if (item.apiKey !== undefined && item.apiKey !== '') {
        update.apiKey = item.apiKey;
      }
      if (item.webhookToken !== undefined && item.webhookToken !== '') {
        update.webhookToken = item.webhookToken;
      }

      await prisma.tenantPaymentCredential.upsert({
        where: {
          accountId_provider: { accountId: tenantId, provider: item.provider },
        },
        create: update as {
          accountId: string;
          provider: PaymentProviderType;
          apiKey?: string;
          webhookToken?: string;
          active: boolean;
        },
        update,
      });
    }

    return this.listCredentials(tenantId);
  }

  /**
   * Returns routing rules for a tenant, or defaults when none exist.
   */
  async listRoutingRules(tenantId: string): Promise<TenantPaymentRoutingRuleDto[]> {
    const rows = await prisma.tenantPaymentRoutingRule.findMany({
      where: { accountId: tenantId },
      orderBy: [{ minAmountCents: 'desc' }, { sortOrder: 'asc' }],
    });

    if (rows.length === 0) {
      return DEFAULT_PAYMENT_ROUTING_RULES.map((rule, index) => ({
        id: `default-${index}`,
        minAmountCents: rule.minAmountCents,
        provider: rule.provider,
        sortOrder: index,
        active: rule.active ?? true,
      }));
    }

    return rows.map(mapRoutingRule);
  }

  /**
   * Replaces all routing rules for a tenant.
   */
  async updateRoutingRules(
    tenantId: string,
    payload: unknown,
  ): Promise<TenantPaymentRoutingRuleDto[]> {
    const parsed = updateTenantPaymentRoutingSchema.parse(payload);

    const sorted = [...parsed.rules].sort((a, b) => b.minAmountCents - a.minAmountCents);
    const hasFallback = sorted.some((rule) => rule.minAmountCents === 0);
    if (!hasFallback) {
      throw new Error('At least one routing rule with minAmountCents = 0 is required');
    }

    await prisma.$transaction(async (tx) => {
      await tx.tenantPaymentRoutingRule.deleteMany({ where: { accountId: tenantId } });

      for (let index = 0; index < sorted.length; index++) {
        const rule = sorted[index];
        await tx.tenantPaymentRoutingRule.create({
          data: {
            accountId: tenantId,
            minAmountCents: rule.minAmountCents,
            provider: rule.provider,
            sortOrder: index,
            active: rule.active ?? true,
          },
        });
      }
    });

    return this.listRoutingRules(tenantId);
  }

  /**
   * Preview which PSP would be selected for a given amount.
   */
  async previewRouting(tenantId: string, amountCents: number) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('amountCents must be a positive integer');
    }

    const rules = await paymentRouter.getRulesForTenant(tenantId);
    const provider = paymentRouter.resolveProvider(rules, amountCents);

    return { amountCents, provider };
  }

  private async ensureLegacyCredentialMigrated(tenantId: string): Promise<void> {
    const legacy = await prisma.tenantPaymentConfig.findUnique({
      where: { accountId: tenantId },
    });
    if (!legacy) return;

    await prisma.tenantPaymentCredential.upsert({
      where: {
        accountId_provider: { accountId: tenantId, provider: legacy.provider },
      },
      create: {
        accountId: tenantId,
        provider: legacy.provider,
        apiKey: legacy.apiKey,
        webhookToken: legacy.webhookToken,
        active: true,
      },
      update: {},
    });
  }
}
