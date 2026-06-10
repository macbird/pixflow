import { describe, expect, it } from 'vitest';
import { resolveMercadoPagoPayerEmail } from './payer-email.util';

const APP_BASE_URL = 'https://pixflow.squareweb.app';

describe('resolveMercadoPagoPayerEmail', () => {
  it('testResolveMercadoPagoPayerEmail_whenSandbox_shouldForceTestuserDomain', () => {
    const email = resolveMercadoPagoPayerEmail(
      '5859470a-74bf-4249-b5f9-fda8a89e95bc',
      'jpaulo_silva2005@yahoo.com.br',
      true,
    );

    expect(email).toMatch(/@testuser\.com$/i);
  });

  it('testResolveMercadoPagoPayerEmail_whenProduction_shouldKeepRealEmail', () => {
    const email = resolveMercadoPagoPayerEmail(
      '5859470a-74bf-4249-b5f9-fda8a89e95bc',
      'cliente@empresa.com.br',
      false,
    );

    expect(email).toBe('cliente@empresa.com.br');
  });

  it('testResolveMercadoPagoPayerEmail_whenProductionAndTestuserEmail_shouldUseFallback', () => {
    const email = resolveMercadoPagoPayerEmail(
      '1c8cb58f-6d0a-4ea1-a853-f5a730e15b4a',
      'joao@testuser.com',
      false,
      undefined,
      APP_BASE_URL,
    );

    expect(email).not.toMatch(/@testuser\.com$/i);
    expect(email).toBe('billing.1c8cb58f6d0a4ea1a853@pixflow.squareweb.app');
  });

  it('testResolveMercadoPagoPayerEmail_whenProductionWithoutEmail_shouldUsePhoneAndAppDomain', () => {
    const email = resolveMercadoPagoPayerEmail(
      '5859470a-74bf-4249-b5f9-fda8a89e95bc',
      undefined,
      false,
      '+55 (11) 95123-5125',
      APP_BASE_URL,
    );

    expect(email).toBe('5511951235125@pixflow.squareweb.app');
  });

  it('testResolveMercadoPagoPayerEmail_whenSandboxWithoutEmail_shouldUsePhoneOnTestuserDomain', () => {
    const email = resolveMercadoPagoPayerEmail(
      '5859470a-74bf-4249-b5f9-fda8a89e95bc',
      undefined,
      true,
      '2351235125',
    );

    expect(email).toBe('2351235125@testuser.com');
  });
});
