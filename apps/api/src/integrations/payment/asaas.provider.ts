import type {
  CreateChargeInput,
  PaymentChargeResult,
  PaymentProvider,
} from './payment-provider.interface';
import { paymentJsonRequest } from './payment-http.util';
import { PaymentProviderError } from './payment-provider.errors';

interface AsaasCustomerResponse {
  id: string;
}

interface AsaasCustomerListResponse {
  data: Array<{ id: string }>;
}

interface AsaasPaymentResponse {
  id: string;
}

interface AsaasPixQrCodeResponse {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
}

/**
 * Asaas PSP adapter — PIX EMV via dynamic QR (copia e cola).
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class AsaasPaymentProvider implements PaymentProvider {
  readonly deliveryType = 'emv' as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  /**
   * Creates a PIX charge and returns the copia e cola payload.
   */
  async createCharge(input: CreateChargeInput): Promise<PaymentChargeResult> {
    const customerId = await this.ensureCustomer(input);
    const dueDate = input.dueDate.toISOString().slice(0, 10);
    const value = Number((input.amountCents / 100).toFixed(2));

    const payment = await paymentJsonRequest<AsaasPaymentResponse>({
      url: `${this.baseUrl}/v3/payments`,
      method: 'POST',
      apiKey: this.apiKey,
      provider: 'asaas',
      body: {
        customer: customerId,
        billingType: 'PIX',
        value,
        dueDate,
        description: input.description ?? `Fatura ${input.invoiceId}`,
        externalReference: input.invoiceId,
      },
    });

    const pix = await paymentJsonRequest<AsaasPixQrCodeResponse>({
      url: `${this.baseUrl}/v3/payments/${payment.id}/pixQrCode`,
      method: 'GET',
      apiKey: this.apiKey,
      provider: 'asaas',
    });

    if (!pix.payload) {
      throw new PaymentProviderError('Asaas did not return PIX copia e cola', 'asaas');
    }

    return {
      providerChargeId: payment.id,
      deliveryType: 'emv',
      copyPasteCode: pix.payload,
      qrCodeBase64: pix.encodedImage,
      expiresAt: pix.expirationDate ? new Date(pix.expirationDate) : undefined,
    };
  }

  private async ensureCustomer(input: CreateChargeInput): Promise<string> {
    const externalReference = input.payerExternalRef ?? input.invoiceId;

    const existing = await paymentJsonRequest<AsaasCustomerListResponse>({
      url: `${this.baseUrl}/v3/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
      method: 'GET',
      apiKey: this.apiKey,
      provider: 'asaas',
    });

    if (existing.data?.length > 0) {
      return existing.data[0].id;
    }

    const created = await paymentJsonRequest<AsaasCustomerResponse>({
      url: `${this.baseUrl}/v3/customers`,
      method: 'POST',
      apiKey: this.apiKey,
      provider: 'asaas',
      body: {
        name: input.payerName,
        email: input.payerEmail ?? undefined,
        mobilePhone: input.payerPhone ? normalizePhoneForAsaas(input.payerPhone) : undefined,
        externalReference,
      },
    });

    return created.id;
  }
}

export function resolveAsaasBaseUrl(): string {
  return process.env.ASAAS_API_BASE_URL?.trim() || 'https://api-sandbox.asaas.com';
}

function normalizePhoneForAsaas(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) return digits;
  return digits.slice(-11);
}
