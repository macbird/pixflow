import type { PaymentProviderValue } from './billing-enums';

export interface PaymentRoutingRuleInput {
  minAmountCents: number;
  provider: PaymentProviderValue;
  active?: boolean;
}

/** Default routing: high amounts → Asaas (fixed fee); low → Mercado Pago (percentual). */
export const DEFAULT_PAYMENT_ROUTING_RULES: PaymentRoutingRuleInput[] = [
  { minAmountCents: 15000, provider: 'asaas', active: true },
  { minAmountCents: 0, provider: 'mercadopago', active: true },
];

/**
 * Resolves which PSP to use for a given invoice amount using descending minAmountCents rules.
 */
export function resolvePaymentProvider(
  rules: PaymentRoutingRuleInput[],
  amountCents: number,
): PaymentProviderValue {
  const activeRules = rules
    .filter((rule) => rule.active !== false)
    .sort((a, b) => b.minAmountCents - a.minAmountCents);

  for (const rule of activeRules) {
    if (amountCents >= rule.minAmountCents) {
      return rule.provider;
    }
  }

  return 'asaas';
}

/** Reference fee models for UI preview (approximate, not contractual). */
export const PAYMENT_PROVIDER_FEE_HINTS: Record<
  PaymentProviderValue,
  { label: string; description: string }
> = {
  asaas: {
    label: 'Taxa fixa',
    description: '~R$ 1,99 por cobrança PIX — melhor para valores altos (anual)',
  },
  mercadopago: {
    label: 'Percentual',
    description: '~% sobre o valor — melhor para mensalidades baixas',
  },
  efi: {
    label: 'Percentual',
    description: 'Taxa percentual — alternativa para valores baixos',
  },
};
