import { PaymentProviderError } from './payment-provider.errors';

/**
 * Performs an authenticated JSON HTTP call to a PSP API.
 */
export async function paymentJsonRequest<T>(options: {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  apiKey: string;
  body?: unknown;
  idempotencyKey?: string;
  provider: string;
}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    access_token: options.apiKey,
  };

  if (options.idempotencyKey) {
    headers['X-Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(options.url, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = extractProviderErrorMessage(payload) ?? `PSP request failed (${response.status})`;
    throw new PaymentProviderError(message, options.provider, response.status);
  }

  return payload as T;
}

function extractProviderErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const first = record.errors[0] as Record<string, unknown>;
    if (typeof first.description === 'string') return first.description;
    if (typeof first.message === 'string') return first.message;
  }
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  return null;
}
