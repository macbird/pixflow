import { describe, expect, it } from 'vitest';
import { buildPaymentReceivedNotificationMessage } from './payment-received-notification';

describe('buildPaymentReceivedNotificationMessage', () => {
  it('testBuildPaymentReceivedNotificationMessage_shouldIncludeCustomerAndAmount', () => {
    const message = buildPaymentReceivedNotificationMessage({
      accountName: 'Toro TV',
      customerName: 'Maria Silva',
      amountCents: 1990,
      billingCycleKey: '2026-06',
      method: 'pix',
      source: 'webhook',
      activationTasksCreated: 1,
    });

    expect(message).toContain('Pagamento recebido');
    expect(message).toContain('Maria Silva');
    expect(message).toContain('R$');
    expect(message).toContain('2026-06');
    expect(message).toContain('Ativações pendentes: 1');
  });
});
