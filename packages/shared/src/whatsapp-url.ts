/**
 * Builds a WhatsApp deep link (wa.me) for the given E.164 digits.
 */
export function buildWaMeUrl(phoneE164Digits: string, text?: string): string {
  const digits = phoneE164Digits.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
