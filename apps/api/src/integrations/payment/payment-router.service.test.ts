import { describe, expect, it } from 'vitest';
import { PaymentRouterService } from './payment-router.service';

describe('PaymentRouterService', () => {
  const service = new PaymentRouterService();

  it('testResolveProvider_whenHighAmount_shouldUseAsaas', () => {
    const rules = [
      { minAmountCents: 15000, provider: 'asaas' as const, active: true },
      { minAmountCents: 0, provider: 'mercadopago' as const, active: true },
    ];

    expect(service.resolveProvider(rules, 42000)).toBe('asaas');
  });

  it('testResolveProvider_whenLowAmount_shouldUseMercadoPago', () => {
    const rules = [
      { minAmountCents: 15000, provider: 'asaas' as const, active: true },
      { minAmountCents: 0, provider: 'mercadopago' as const, active: true },
    ];

    expect(service.resolveProvider(rules, 3500)).toBe('mercadopago');
  });

  it('testResolveProvider_whenAmountEqualsThreshold_shouldUseMatchingRule', () => {
    const rules = [
      { minAmountCents: 15000, provider: 'asaas' as const, active: true },
      { minAmountCents: 0, provider: 'mercadopago' as const, active: true },
    ];

    expect(service.resolveProvider(rules, 15000)).toBe('asaas');
  });

  it('testResolveProvider_whenRuleInactive_shouldSkipRule', () => {
    const rules = [
      { minAmountCents: 15000, provider: 'asaas' as const, active: false },
      { minAmountCents: 0, provider: 'mercadopago' as const, active: true },
    ];

    expect(service.resolveProvider(rules, 50000)).toBe('mercadopago');
  });
});
