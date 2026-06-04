import type { BillingScope, PaymentProviderType } from '@prisma/client';
import { prisma } from '../../core/database';
import { safeDecryptCredential } from '../../core/crypto/credential-crypto';
import type { PaymentProvider } from './payment-provider.interface';
import { AsaasPaymentProvider, resolveAsaasBaseUrl } from './asaas.provider';
import { MercadoPagoPaymentProvider } from './mercadopago.provider';
import { PaymentProviderError } from './payment-provider.errors';
import { PaymentRouterService } from './payment-router.service';

const paymentRouter = new PaymentRouterService();

/**
 * Resolves PSP credentials and instantiates payment adapters.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class PaymentProviderFactory {
  /**
   * Resolves which PSP to use for an invoice amount and scope.
   */
  async resolveProvider(
    scope: BillingScope,
    accountId: string,
    amountCents: number,
  ): Promise<PaymentProviderType> {
    if (scope === 'platform') {
      const config = await prisma.platformPaymentConfig.findUnique({
        where: { id: 'default' },
      });
      return config?.provider ?? 'asaas';
    }
    return paymentRouter.resolveForTenant(accountId, amountCents);
  }

  /**
   * Loads the API key for the given scope, account and provider.
   */
  async getApiKey(
    scope: BillingScope,
    accountId: string,
    provider: PaymentProviderType,
  ): Promise<string | null> {
    if (scope === 'platform') {
      const config = await prisma.platformPaymentConfig.findUnique({
        where: { id: 'default' },
      });
      if (!config?.apiKey || config.provider !== provider) {
        return null;
      }
      return resolveStoredSecret(config.apiKey);
    }

    const credential = await prisma.tenantPaymentCredential.findUnique({
      where: {
        accountId_provider: { accountId, provider },
      },
    });

    if (!credential?.active || !credential.apiKey) {
      return null;
    }

    return resolveStoredSecret(credential.apiKey);
  }

  /**
   * Returns a configured payment adapter for the invoice context.
   */
  async getProvider(
    scope: BillingScope,
    accountId: string,
    provider: PaymentProviderType,
  ): Promise<PaymentProvider> {
    const apiKey = await this.getApiKey(scope, accountId, provider);
    if (!apiKey) {
      throw new PaymentProviderError(
        `Credencial do PSP "${provider}" não configurada. Configure em Configurações.`,
        provider,
      );
    }

    switch (provider) {
      case 'asaas':
        return new AsaasPaymentProvider(apiKey, resolveAsaasBaseUrl());
      case 'mercadopago':
        return new MercadoPagoPaymentProvider(apiKey);
      case 'efi':
        throw new PaymentProviderError('Provider Efi ainda não implementado', 'efi');
      default:
        throw new PaymentProviderError(`Provider "${provider}" não suportado`, provider);
    }
  }
}

function resolveStoredSecret(value: string): string {
  const decrypted = safeDecryptCredential(value);
  return decrypted || value;
}
