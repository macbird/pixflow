import type { BillingScope } from '@prisma/client';
import { prisma } from '../../core/database';
import { safeDecryptCredential } from '../../core/crypto/credential-crypto';
import { EvolutionWhatsAppProvider } from './evolution.provider';
import type { WhatsAppProvider } from './whatsapp-provider.interface';

/**
 * Builds WhatsApp adapters from platform or tenant configuration.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export class WhatsAppProviderFactory {
  /**
   * Returns a configured WhatsApp provider for the billing scope.
   */
  async getProvider(scope: BillingScope, accountId: string): Promise<WhatsAppProvider> {
    if (scope === 'platform') {
      const config = await prisma.platformWhatsappConfig.findUnique({
        where: { id: 'default' },
      });
      return this.buildFromConfig(config);
    }

    const config = await prisma.tenantWhatsappConfig.findUnique({
      where: { accountId },
    });
    return this.buildFromConfig(config);
  }

  private buildFromConfig(
    config: {
      provider: string;
      instanceUrl: string | null;
      apiKey: string | null;
    } | null,
  ): WhatsAppProvider {
    if (!config?.instanceUrl || !config.apiKey) {
      throw new Error(
        'WhatsApp não configurado. Informe URL da instância e API key em Configurações.',
      );
    }

    const apiKey = safeDecryptCredential(config.apiKey) || config.apiKey;
    const instanceName = resolveEvolutionInstanceName(config.instanceUrl);

    if (config.provider === 'evolution') {
      return new EvolutionWhatsAppProvider(config.instanceUrl, apiKey, instanceName);
    }

    throw new Error(`Provider WhatsApp "${config.provider}" ainda não implementado`);
  }
}

function resolveEvolutionInstanceName(instanceUrl: string): string {
  const fromEnv = process.env.EVOLUTION_INSTANCE_NAME?.trim();
  if (fromEnv) return fromEnv;

  try {
    const pathname = new URL(instanceUrl).pathname.replace(/^\//, '');
    if (pathname && !pathname.includes('/')) {
      return pathname;
    }
  } catch {
    // ignore invalid URL
  }

  return 'default';
}
