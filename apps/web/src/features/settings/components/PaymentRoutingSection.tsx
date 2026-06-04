import type { PaymentProviderValue, TenantPaymentRoutingRuleDto } from '@client-manager/shared';

export function extractSelectedProvider(
  fromApi: TenantPaymentRoutingRuleDto[] | undefined,
): PaymentProviderValue {
  if (!fromApi?.length) {
    return 'mercadopago';
  }

  const activeRules = fromApi.filter((rule) => rule.active !== false);
  const catchAll = activeRules.find((rule) => rule.minAmountCents === 0);
  if (catchAll) {
    return catchAll.provider as PaymentProviderValue;
  }

  if (activeRules.length === 1) {
    return activeRules[0].provider as PaymentProviderValue;
  }

  const sorted = [...activeRules].sort((a, b) => a.minAmountCents - b.minAmountCents);
  return (sorted[0]?.provider ?? 'mercadopago') as PaymentProviderValue;
}

export function selectedProviderToPayload(provider: PaymentProviderValue) {
  return {
    rules: [{ minAmountCents: 0, provider, active: true }],
  };
}
