import type {
  CreateChargeInput,
  PaymentChargeResult,
  PaymentProvider,
} from './payment-provider.interface';
import { PaymentProviderError } from './payment-provider.errors';
import { resolveMercadoPagoPayerEmail } from './payer-email.util';

interface MercadoPagoOrderPaymentMethod {
  id?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

interface MercadoPagoOrderResponse {
  id: string;
  transactions?: {
    payments?: Array<{
      id: string;
      payment_method?: MercadoPagoOrderPaymentMethod;
    }>;
  };
  message?: string;
  errors?: Array<{ code?: string; message?: string; details?: string[] }>;
}

interface MercadoPagoUserProfile {
  nickname?: string;
  email?: string;
}

/**
 * Mercado Pago PSP adapter — PIX via Orders API (Checkout API orders).
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class MercadoPagoPaymentProvider implements PaymentProvider {
  readonly deliveryType = 'emv' as const;

  private sandboxMode: boolean | null = null;

  constructor(private readonly accessToken: string) {}

  /**
   * Creates a PIX charge using POST /v1/orders and returns copia e cola from payment_method.
   */
  async createCharge(input: CreateChargeInput): Promise<PaymentChargeResult> {
    const sandbox = await this.isSandboxAccount();
    const amount = (input.amountCents / 100).toFixed(2);
    const email = resolveMercadoPagoPayerEmail(
      input.invoiceId,
      input.payerEmail,
      sandbox,
      input.payerPhone,
    );

    const body = {
      type: 'online',
      external_reference: input.invoiceId,
      total_amount: amount,
      payer: { email },
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: 'pix',
              type: 'bank_transfer',
            },
          },
        ],
      },
    };

    const order = await this.createOrder(body, `cm-${input.invoiceId}`, input.invoiceId);

    const payment = order.transactions?.payments?.[0];
    const method = payment?.payment_method;
    if (!payment?.id || !method?.qr_code) {
      throw new PaymentProviderError(
        'Mercado Pago did not return PIX copia e cola',
        'mercadopago',
      );
    }

    return {
      providerChargeId: payment.id,
      deliveryType: 'emv',
      copyPasteCode: method.qr_code,
      qrCodeBase64: method.qr_code_base64,
    };
  }

  private async createOrder(
    body: Record<string, unknown>,
    idempotencyKey: string,
    invoiceId: string,
  ): Promise<MercadoPagoOrderResponse> {
    let response = await this.postOrder(body, idempotencyKey);
    let order = await this.parseOrderResponse(response);

    if (
      !response.ok &&
      (isIdempotencyConflict(order, response.status) || isRetryableOrderFailure(order, response.status))
    ) {
      response = await this.postOrder(body, `cm-${invoiceId}-${Date.now()}`);
      order = await this.parseOrderResponse(response);
    }

    if (!response.ok) {
      const rawMessage = extractMercadoPagoError(order, response.status);
      throw new PaymentProviderError(mapMercadoPagoErrorMessage(rawMessage), 'mercadopago', response.status);
    }

    return order;
  }

  private postOrder(body: Record<string, unknown>, idempotencyKey: string) {
    return fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });
  }

  private async parseOrderResponse(response: Response): Promise<MercadoPagoOrderResponse> {
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as MercadoPagoOrderResponse;
  }

  private async isSandboxAccount(): Promise<boolean> {
    if (this.sandboxMode !== null) {
      return this.sandboxMode;
    }

    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!response.ok) {
        this.sandboxMode = this.accessToken.startsWith('TEST-');
        return this.sandboxMode;
      }

      const profile = (await response.json()) as MercadoPagoUserProfile;
      this.sandboxMode =
        profile.nickname?.startsWith('TESTUSER') === true ||
        profile.email?.toLowerCase().includes('@testuser.com') === true;
      return this.sandboxMode;
    } catch {
      this.sandboxMode = this.accessToken.startsWith('TEST-');
      return this.sandboxMode;
    }
  }
}

function isRetryableOrderFailure(payload: MercadoPagoOrderResponse, status: number): boolean {
  const combined = [
    payload.message,
    ...(payload.errors?.map((item) => item.message) ?? []),
    ...(payload.errors?.flatMap((item) => item.details ?? []) ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  return status === 402 || /transactions failed|invalid_users_involved/i.test(combined);
}

function isIdempotencyConflict(payload: MercadoPagoOrderResponse, status: number): boolean {
  const combined = [
    payload.message,
    ...(payload.errors?.map((item) => item.message) ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  return status === 409 || /idempotency-key already used/i.test(combined);
}

function extractMercadoPagoError(payload: MercadoPagoOrderResponse, status: number): string {
  if (payload.errors?.length) {
    const parts = payload.errors.flatMap((item) => {
      const details = (item as { details?: string[] }).details ?? [];
      return [item.message, ...details].filter((part): part is string => Boolean(part));
    });
    if (parts.length > 0) {
      return parts.join(' — ');
    }
  }
  return payload.message ?? `Mercado Pago error (${status})`;
}

function mapMercadoPagoErrorMessage(message: string): string {
  if (/access_token/i.test(message)) {
    return 'Access Token inválido. Copie o Access Token (token longo), não a Public Key nem o usuário TESTUSER.';
  }
  if (/invalid_email_for_sandbox|@testuser\.com/i.test(message)) {
    return 'No sandbox do Mercado Pago o pagador precisa usar e-mail @testuser.com. O sistema ajusta isso automaticamente — tente gerar o PIX novamente.';
  }
  if (/payer\.email/i.test(message)) {
    return 'E-mail do pagador inválido. Cadastre um e-mail válido no cliente ou use o e-mail do titular da conta.';
  }
  if (/live credentials/i.test(message)) {
    return 'Integração Mercado Pago desatualizada para credenciais de teste APP_USR. Atualize a API e tente novamente.';
  }
  if (/invalid_users_involved/i.test(message)) {
    return 'E-mail do pagador inválido para credencial de produção. Use e-mail real do cliente (não @testuser.com) ou credenciais de teste do Mercado Pago.';
  }
  if (/transactions failed/i.test(message)) {
    return `Mercado Pago recusou o PIX: ${message}`;
  }
  return message;
}
