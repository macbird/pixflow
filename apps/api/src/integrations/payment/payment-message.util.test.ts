import { describe, expect, it } from 'vitest';
import {
  buildBillingChargeMessage,
  buildPaymentWhatsAppBlock,
} from './payment-message.util';
import { normalizePhoneE164 } from '@client-manager/shared';

describe('payment-message.util', () => {
  it('testBuildPaymentWhatsAppBlock_whenEmv_shouldReturnCopyPaste', () => {
    const block = buildPaymentWhatsAppBlock({
      pixCopyPaste: '000201PIX',
      amountCents: 5000,
      billingCycleKey: '2026-06',
      dueDate: '2026-06-10',
    });

    expect(block).toContain('PIX copia e cola');
    expect(block).toContain('000201PIX');
  });

  it('testBuildBillingChargeMessage_shouldIncludeAmountAndDueDate', () => {
    const message = buildBillingChargeMessage({
      payerName: 'Maria Silva',
      invoice: {
        pixCopyPaste: '000201PIX',
        amountCents: 4990,
        billingCycleKey: '2026-06',
        dueDate: new Date('2026-06-15T12:00:00.000Z'),
      },
    });

    expect(message).toContain('Maria Silva');
    expect(message).toContain('2026-06');
    expect(message).toContain('R$');
  });
});

describe('normalizePhoneE164', () => {
  it('testNormalizePhoneE164_whenBrazilWithoutCountryCode_shouldPrefix55', () => {
    expect(normalizePhoneE164('11987654321')).toBe('5511987654321');
  });

  it('testNormalizePhoneE164_whenAlreadyInternational_shouldKeepDigits', () => {
    expect(normalizePhoneE164('+55 (11) 98765-4321')).toBe('5511987654321');
  });
});
