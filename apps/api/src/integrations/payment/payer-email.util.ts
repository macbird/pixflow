const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_APP_BASE_URL = 'https://pixflow.squareweb.app';

/**
 * Checks whether a string is a basic valid e-mail address.
 */
export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * Resolves payer e-mail for Mercado Pago.
 * Sandbox accounts require addresses ending with @testuser.com.
 * When the payer has no e-mail, uses phone digits + app hostname (e.g. 5511999999999@pixflow.squareweb.app).
 */
export function resolveMercadoPagoPayerEmail(
  invoiceId: string,
  payerEmail?: string,
  sandbox = false,
  payerPhone?: string,
  appBaseUrl?: string,
): string {
  const appDomain = resolveAppEmailDomain(appBaseUrl);
  const phoneLocalPart = normalizePhoneEmailLocalPart(payerPhone);

  if (sandbox) {
    const trimmed = payerEmail?.trim();
    if (trimmed && trimmed.toLowerCase().endsWith('@testuser.com') && isValidEmail(trimmed)) {
      return trimmed;
    }
    if (phoneLocalPart) {
      return `${phoneLocalPart}@testuser.com`;
    }
    const localPart = invoiceId.replace(/-/g, '').slice(0, 20);
    return `billing.${localPart}@testuser.com`;
  }

  const trimmed = payerEmail?.trim();
  if (trimmed && isValidEmail(trimmed) && !isSandboxOnlyEmail(trimmed)) {
    return trimmed;
  }

  if (phoneLocalPart) {
    return `${phoneLocalPart}@${appDomain}`;
  }

  const localPart = invoiceId.replace(/-/g, '').slice(0, 20);
  return `billing.${localPart}@${appDomain}`;
}

function isSandboxOnlyEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@testuser.com');
}

function normalizePhoneEmailLocalPart(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

function resolveAppEmailDomain(baseUrl?: string): string {
  const raw = (baseUrl ?? process.env.API_PUBLIC_BASE_URL ?? DEFAULT_APP_BASE_URL).trim();
  try {
    return new URL(raw).hostname;
  } catch {
    return new URL(DEFAULT_APP_BASE_URL).hostname;
  }
}
