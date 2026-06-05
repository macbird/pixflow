import { describe, expect, it } from 'vitest';
import { resolveTenantNotifyPhone } from './payment-received-notification.service';

/**
 * Unit tests for tenant payment received WhatsApp notification helpers.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 */
describe('resolveTenantNotifyPhone', () => {
  it('testResolveTenantNotifyPhone_whenAccountPhone_shouldNormalize', () => {
    expect(resolveTenantNotifyPhone('11987654321')).toBe('5511987654321');
  });

  it('testResolveTenantNotifyPhone_whenMissing_shouldReturnNull', () => {
    expect(resolveTenantNotifyPhone(null)).toBeNull();
  });
});
