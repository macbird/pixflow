const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 */
export function resolveMercadoPagoPayerEmail(
  invoiceId: string,
  payerEmail?: string,
  sandbox = false,
): string {
  const localPart = invoiceId.replace(/-/g, '').slice(0, 20);

  if (sandbox) {
    const trimmed = payerEmail?.trim();
    if (trimmed && trimmed.toLowerCase().endsWith('@testuser.com') && isValidEmail(trimmed)) {
      return trimmed;
    }
    return `billing.${localPart}@testuser.com`;
  }

  const trimmed = payerEmail?.trim();
  if (trimmed && isValidEmail(trimmed) && !isSandboxOnlyEmail(trimmed)) {
    return trimmed;
  }

  return `billing.${localPart}@example.com`;
}

function isSandboxOnlyEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@testuser.com');
}
