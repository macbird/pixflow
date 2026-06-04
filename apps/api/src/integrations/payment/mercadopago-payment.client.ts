import { PaymentProviderError } from './payment-provider.errors';

export interface MercadoPagoPaymentDetails {
  id: string;
  status: string;
  transactionAmountCents: number;
  externalReference: string | null;
  paidAt: Date | null;
}

interface MercadoPagoPaymentResponse {
  id: number | string;
  status: string;
  transaction_amount?: number;
  external_reference?: string;
  date_approved?: string | null;
}

interface MercadoPagoPaymentSearchResponse {
  results?: MercadoPagoPaymentResponse[];
}

/**
 * Loads a Mercado Pago payment by numeric id using GET /v1/payments/{id}.
 */
export async function fetchMercadoPagoPayment(
  accessToken: string,
  paymentId: string,
): Promise<MercadoPagoPaymentDetails> {
  return fetchMercadoPagoPaymentById(accessToken, paymentId);
}

/**
 * Resolves payment status for webhook processing (Orders API PAY ids or legacy numeric ids).
 */
export async function resolveMercadoPagoPaymentForWebhook(
  accessToken: string,
  options: {
    paymentId: string;
    externalReference?: string | null;
    expectedAmountCents?: number;
  },
): Promise<MercadoPagoPaymentDetails> {
  if (!isOrdersApiPaymentId(options.paymentId)) {
    try {
      return await fetchMercadoPagoPaymentById(accessToken, options.paymentId);
    } catch (error) {
      if (!options.externalReference) {
        throw error;
      }
    }
  }

  if (options.externalReference) {
    const payment = await searchMercadoPagoPaymentByExternalReference(
      accessToken,
      options.externalReference,
      options.expectedAmountCents,
    );
    if (payment) {
      return payment;
    }
  }

  throw new PaymentProviderError(
    'Mercado Pago payment not found for webhook notification',
    'mercadopago',
    404,
  );
}

/**
 * Searches Mercado Pago payments by invoice external_reference.
 */
export async function searchMercadoPagoPaymentByExternalReference(
  accessToken: string,
  externalReference: string,
  expectedAmountCents?: number,
): Promise<MercadoPagoPaymentDetails | null> {
  const url = new URL('https://api.mercadopago.com/v1/payments/search');
  url.searchParams.set('external_reference', externalReference);
  url.searchParams.set('sort', 'date_created');
  url.searchParams.set('criteria', 'desc');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = (await response.json()) as MercadoPagoPaymentSearchResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new PaymentProviderError(
      payload.message ?? `Mercado Pago payment search failed (${response.status})`,
      'mercadopago',
      response.status,
    );
  }

  const results = payload.results ?? [];
  const expectedAmount = expectedAmountCents !== undefined ? expectedAmountCents / 100 : undefined;

  const matching = results.filter((item) => {
    if (expectedAmount === undefined) return true;
    return item.transaction_amount === expectedAmount;
  });

  const preferred =
    matching.find((item) => item.status === 'approved') ??
    matching.find((item) => item.status === 'pending') ??
    matching[0] ??
    results[0];

  return preferred ? mapMercadoPagoPayment(preferred) : null;
}

export function isMercadoPagoPaymentApproved(status: string): boolean {
  return status === 'approved';
}

function isOrdersApiPaymentId(paymentId: string): boolean {
  return paymentId.startsWith('PAY');
}

async function fetchMercadoPagoPaymentById(
  accessToken: string,
  paymentId: string,
): Promise<MercadoPagoPaymentDetails> {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await response.text();
  const payload = (text ? JSON.parse(text) : {}) as MercadoPagoPaymentResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new PaymentProviderError(
      payload.message ?? `Mercado Pago payment lookup failed (${response.status})`,
      'mercadopago',
      response.status,
    );
  }

  return mapMercadoPagoPayment(payload);
}

function mapMercadoPagoPayment(payload: MercadoPagoPaymentResponse): MercadoPagoPaymentDetails {
  return {
    id: String(payload.id),
    status: payload.status,
    transactionAmountCents: Math.round((payload.transaction_amount ?? 0) * 100),
    externalReference: payload.external_reference ?? null,
    paidAt: payload.date_approved ? new Date(payload.date_approved) : null,
  };
}
