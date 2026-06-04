import { describe, expect, it } from 'vitest';
import {
  buildMercadoPagoWebhookUrl,
  extractMercadoPagoPaymentId,
} from './payment-webhook.util';

describe('buildMercadoPagoWebhookUrl', () => {
  it('testBuildMercadoPagoWebhookUrl_whenTenantSlugProvided_shouldReturnPublicPath', () => {
    const url = buildMercadoPagoWebhookUrl('joao-paulo', { baseUrl: 'https://api.example.com' });

    expect(url).toBe('https://api.example.com/api/webhooks/payment/joao-paulo/mercadopago');
  });

  it('testBuildMercadoPagoWebhookUrl_whenSlugHasSpaces_shouldEncodePathSegment', () => {
    const url = buildMercadoPagoWebhookUrl('Toro TV', { baseUrl: 'https://api.example.com' });

    expect(url).toBe('https://api.example.com/api/webhooks/payment/Toro%20TV/mercadopago');
  });

  it('testBuildMercadoPagoWebhookUrl_whenTokenProvided_shouldAppendQueryParam', () => {
    const url = buildMercadoPagoWebhookUrl('joao-paulo', {
      baseUrl: 'https://api.example.com',
      webhookToken: 'secret-token',
    });

    expect(url).toBe(
      'https://api.example.com/api/webhooks/payment/joao-paulo/mercadopago?token=secret-token',
    );
  });
});

describe('extractMercadoPagoPaymentId', () => {
  it('testExtractMercadoPagoPaymentId_whenJsonBody_shouldReadDataId', () => {
    const id = extractMercadoPagoPaymentId(
      { type: 'payment', data: { id: 'PAY01KT8DXBEYDDHKMZH50J57MS3W' } },
      {},
    );

    expect(id).toBe('PAY01KT8DXBEYDDHKMZH50J57MS3W');
  });

  it('testExtractMercadoPagoPaymentId_whenLegacyQuery_shouldReadTopicPayment', () => {
    const id = extractMercadoPagoPaymentId(null, {
      topic: 'payment',
      id: '123456789',
    });

    expect(id).toBe('123456789');
  });
});
