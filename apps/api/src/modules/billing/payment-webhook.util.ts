/**
 * Helpers for Mercado Pago payment webhook URLs and payload parsing.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

/**
 * Builds the public Mercado Pago webhook URL for a tenant or the platform.
 */
export function buildMercadoPagoWebhookUrl(
  tenantSlug: string,
  options?: { baseUrl?: string; webhookToken?: string | null },
): string {
  const base = (options?.baseUrl ?? process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  const encodedSlug = encodeURIComponent(tenantSlug);
  const path = `/api/webhooks/payment/${encodedSlug}/mercadopago`;
  const url = `${base}${path}`;

  if (options?.webhookToken) {
    return `${url}?token=${encodeURIComponent(options.webhookToken)}`;
  }

  return url;
}

/**
 * Extracts the Mercado Pago payment id from webhook query params or JSON body.
 */
export function extractMercadoPagoPaymentId(
  body: unknown,
  query: Record<string, unknown>,
): string | null {
  const topic = typeof query.topic === 'string' ? query.topic : null;
  const queryId =
    typeof query.id === 'string' || typeof query.id === 'number' ? String(query.id) : null;
  if (topic === 'payment' && queryId) {
    return queryId;
  }

  if (!body || typeof body !== 'object') {
    return queryId;
  }

  const record = body as Record<string, unknown>;
  const type = typeof record.type === 'string' ? record.type : null;
  const data = record.data;
  if (type === 'payment' && data && typeof data === 'object') {
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
