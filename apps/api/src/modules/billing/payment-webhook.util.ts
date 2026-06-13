/** Helpers for Mercado Pago payment webhook URLs and payload parsing. */

/**
 * Builds the public Mercado Pago webhook URL for a tenant account or the platform.
 */
export function buildMercadoPagoWebhookUrl(
  tenantId: string,
  options?: { baseUrl?: string; webhookToken?: string | null },
): string {
  const base = (options?.baseUrl ?? process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  const path = `/api/webhooks/payment/${tenantId}/mercadopago`;
  const url = `${base}${path}`;

  if (options?.webhookToken) {
    return `${url}?token=${encodeURIComponent(options.webhookToken)}`;
  }

  return url;
}

/**
 * Normalizes tenant reference from webhook path segment (account id or legacy slug).
 */
export function decodeWebhookTenantRef(rawRef: string): string {
  try {
    return decodeURIComponent(rawRef);
  } catch {
    return rawRef;
  }
}

function readQueryPaymentId(query: Record<string, unknown>): string | null {
  const raw = query.id ?? query['data.id'];
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  return null;
}

/**
 * Extracts the Mercado Pago payment id from webhook query params or JSON body.
 */
export function extractMercadoPagoPaymentId(
  body: unknown,
  query: Record<string, unknown>,
): string | null {
  const topic = typeof query.topic === 'string' ? query.topic : null;
  const type = typeof query.type === 'string' ? query.type : null;
  const queryId = readQueryPaymentId(query);
  if ((topic === 'payment' || type === 'payment') && queryId) {
    return queryId;
  }

  if (!body || typeof body !== 'object') {
    return queryId;
  }

  const record = body as Record<string, unknown>;
  const bodyType = typeof record.type === 'string' ? record.type : null;
  const data = record.data;
  if (bodyType === 'payment' && data && typeof data === 'object') {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === 'string' || typeof id === 'number') {
      return String(id);
    }
  }

  if (typeof record.id === 'string' || typeof record.id === 'number') {
    return String(record.id);
  }

  return queryId;
}
