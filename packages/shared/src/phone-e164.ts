/**
 * Normalizes Brazilian phone numbers to E.164 digits (55 + DDD + number).
 */
export function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}
