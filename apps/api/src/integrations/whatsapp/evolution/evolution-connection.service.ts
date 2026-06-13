import type {
  EvolutionConnectResponseDto,
  EvolutionTestMessageResponseDto,
  WhatsAppEvolutionConnectionDto,
} from '@client-manager/shared';
import { normalizePhoneE164 } from '@client-manager/shared';
import { prisma } from '../../../core/database';
import { encryptCredential, safeDecryptCredential } from '../../../core/crypto/credential-crypto';
import { EvolutionAdminClient } from '../evolution-admin.client';
import {
  buildEvolutionInstanceUrl,
  parseEvolutionConnectionConfig,
} from '../evolution-config.util';
import { EvolutionWhatsAppProvider } from '../evolution.provider';
import { getEvolutionPlatformConfig } from './evolution-platform.config';
import { EvolutionWhatsAppError } from './evolution-whatsapp.errors';
import {
  formatEvolutionDisplayPhone,
  hasEvolutionSessionProof,
  mapEvolutionState,
  type EvolutionSessionSignals,
} from './evolution-state.util';

const PLATFORM_WHATSAPP_CONFIG_ID = 'default';
const PLATFORM_EVOLUTION_INSTANCE = 'platform';

/**
 * Orchestrates Evolution WhatsApp connection for tenants (QR / pairing code).
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 10/06/2026

 */
export class EvolutionConnectionService {
  /**
   * Returns non-secret Evolution connection state for the tenant settings UI.
   */
  async getConnection(accountId: string): Promise<WhatsAppEvolutionConnectionDto> {
    const context = await this.loadTenantContext(accountId);
    if (!context) {
      return {
        provider: 'evolution',
        connectionStatus: 'disconnected',
        instanceName: null,
        displayPhoneNumber: null,
        instanceConfigured: false,
      };
    }

    const existing = await prisma.tenantWhatsappConfig.findUnique({ where: { accountId } });
    if (existing?.instanceUrl) {
      await this.syncFromEvolution(accountId, context.instanceName, context.client);
    }

    return this.readConnectionDto(accountId, context.instanceName);
  }

  /**
   * Ensures the tenant instance exists and returns QR or pairing code for linking.
   */
  async startConnect(accountId: string, phone?: string): Promise<EvolutionConnectResponseDto> {
    const context = await this.requireTenantContext(accountId);
    const normalizedPhone = phone ? normalizePhoneE164(phone) : undefined;
    if (phone && !normalizedPhone) {
      throw new EvolutionWhatsAppError('Número de telefone inválido.', 'NO_ACCOUNT');
    }

    await context.client.ensureInstance({
      instanceName: context.instanceName,
      token: context.instanceName,
    });

    let summary = await context.client.fetchInstanceSummary(context.instanceName).catch(() => null);
    let connect = await context.client.getConnectInfo(context.instanceName, normalizedPhone);
    let remoteState = connect.state.toLowerCase();

    if (
      (remoteState === 'open' || remoteState === 'connected') &&
      !hasEvolutionSessionProof(toSessionSignals(summary))
    ) {
      await context.client.logoutInstance(context.instanceName).catch(() => undefined);
      connect = await context.client.getConnectInfo(context.instanceName, normalizedPhone);
      remoteState = connect.state.toLowerCase();
      summary = await context.client.fetchInstanceSummary(context.instanceName).catch(() => null);
    }

    const connectionStatus = mapEvolutionState(
      remoteState,
      summary?.connectionStatus?.toLowerCase(),
      toSessionSignals(summary),
    );

    await prisma.tenantWhatsappConfig.upsert({
      where: { accountId },
      create: {
        accountId,
        provider: 'evolution',
        instanceUrl: context.instanceUrl,
        apiKey: context.encryptedApiKey,
        connectionStatus,
        displayPhoneNumber: normalizedPhone ?? null,
      },
      update: {
        provider: 'evolution',
        instanceUrl: context.instanceUrl,
        apiKey: context.encryptedApiKey,
        connectionStatus,
        ...(normalizedPhone ? { displayPhoneNumber: normalizedPhone } : {}),
      },
    });

    if (connectionStatus === 'connected') {
      await this.syncFromEvolution(accountId, context.instanceName, context.client);
      return {
        state: connect.state,
        connectionStatus: 'connected',
        qrCodeBase64: null,
        pairingCode: null,
      };
    }

    await prisma.tenantWhatsappConfig.update({
      where: { accountId },
      data: { connectionStatus: 'pending' },
    });

    return {
      state: connect.state,
      connectionStatus: 'pending',
      qrCodeBase64: connect.qrCodeBase64 ?? null,
      pairingCode: connect.pairingCode ?? null,
    };
  }

  /**
   * Logs out the WhatsApp session and marks the tenant as disconnected.
   */
  async disconnect(accountId: string): Promise<WhatsAppEvolutionConnectionDto> {
    const context = await this.loadTenantContext(accountId);
    if (context) {
      await context.client.logoutInstance(context.instanceName).catch(() => undefined);
    }

    await prisma.tenantWhatsappConfig.upsert({
      where: { accountId },
      create: {
        accountId,
        provider: 'evolution',
        connectionStatus: 'disconnected',
      },
      update: {
        connectionStatus: 'disconnected',
        displayPhoneNumber: null,
      },
    });

    return this.readConnectionDto(accountId, context?.instanceName ?? null);
  }

  /**
   * Sends a test text message using the tenant Evolution instance.
   */
  async sendTestMessage(
    accountId: string,
    phone?: string,
    text?: string,
  ): Promise<EvolutionTestMessageResponseDto> {
    const config = await prisma.tenantWhatsappConfig.findUnique({ where: { accountId } });
    if (!config?.instanceUrl || !config.apiKey) {
      throw new EvolutionWhatsAppError(
        'WhatsApp Evolution não provisionado. Conecte em Configurações → WhatsApp.',
        'NOT_CONFIGURED',
      );
    }

    if (config.connectionStatus !== 'connected') {
      throw new EvolutionWhatsAppError(
        'WhatsApp não conectado. Escaneie o QR ou use o código de pareamento.',
        'NOT_CONNECTED',
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { phone: true },
    });

    const rawPhone = phone ?? account?.phone ?? null;
    if (!rawPhone) {
      throw new EvolutionWhatsAppError(
        'Informe um número de teste ou cadastre accounts.phone para o tenant.',
        'NO_ACCOUNT',
      );
    }

    const targetPhone = normalizePhoneE164(rawPhone);
    if (!targetPhone) {
      throw new EvolutionWhatsAppError('Número de telefone inválido.', 'NO_ACCOUNT');
    }

    const { baseUrl, instanceName } = parseEvolutionConnectionConfig(config.instanceUrl);
    const apiKey = safeDecryptCredential(config.apiKey) || config.apiKey;
    const provider = new EvolutionWhatsAppProvider(baseUrl, apiKey, instanceName);
    const message = text?.trim() || 'Teste PixFlow — WhatsApp Evolution conectado com sucesso.';
    const result = await provider.sendText({ phoneE164: targetPhone, text: message });

    return {
      providerMessageId: result.providerMessageId,
      sentTo: targetPhone,
    };
  }

  /**
   * Returns non-secret Evolution connection state for the platform admin settings UI.
   */
  async getPlatformConnection(): Promise<WhatsAppEvolutionConnectionDto> {
    const context = await this.loadPlatformContext();
    if (!context) {
      return {
        provider: 'evolution',
        connectionStatus: 'disconnected',
        instanceName: null,
        displayPhoneNumber: null,
        instanceConfigured: false,
      };
    }

    const existing = await prisma.platformWhatsappConfig.findUnique({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
    });
    if (existing?.instanceUrl) {
      await this.syncPlatformFromEvolution(context.instanceName, context.client);
    }

    return this.readPlatformConnectionDto(context.instanceName);
  }

  /**
   * Ensures the platform instance exists and returns QR or pairing code for linking.
   */
  async startPlatformConnect(phone?: string): Promise<EvolutionConnectResponseDto> {
    const context = await this.requirePlatformContext();
    const normalizedPhone = phone ? normalizePhoneE164(phone) : undefined;
    if (phone && !normalizedPhone) {
      throw new EvolutionWhatsAppError('Número de telefone inválido.', 'NO_ACCOUNT');
    }

    await context.client.ensureInstance({
      instanceName: context.instanceName,
      token: context.instanceName,
    });

    let summary = await context.client.fetchInstanceSummary(context.instanceName).catch(() => null);
    let connect = await context.client.getConnectInfo(context.instanceName, normalizedPhone);
    let remoteState = connect.state.toLowerCase();

    if (
      (remoteState === 'open' || remoteState === 'connected') &&
      !hasEvolutionSessionProof(toSessionSignals(summary))
    ) {
      await context.client.logoutInstance(context.instanceName).catch(() => undefined);
      connect = await context.client.getConnectInfo(context.instanceName, normalizedPhone);
      remoteState = connect.state.toLowerCase();
      summary = await context.client.fetchInstanceSummary(context.instanceName).catch(() => null);
    }

    const connectionStatus = mapEvolutionState(
      remoteState,
      summary?.connectionStatus?.toLowerCase(),
      toSessionSignals(summary),
    );

    await prisma.platformWhatsappConfig.upsert({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      create: {
        id: PLATFORM_WHATSAPP_CONFIG_ID,
        provider: 'evolution',
        instanceUrl: context.instanceUrl,
        apiKey: context.encryptedApiKey,
        connectionStatus,
        displayPhoneNumber: normalizedPhone ?? null,
      },
      update: {
        provider: 'evolution',
        instanceUrl: context.instanceUrl,
        apiKey: context.encryptedApiKey,
        connectionStatus,
        ...(normalizedPhone ? { displayPhoneNumber: normalizedPhone } : {}),
      },
    });

    if (connectionStatus === 'connected') {
      await this.syncPlatformFromEvolution(context.instanceName, context.client);
      return {
        state: connect.state,
        connectionStatus: 'connected',
        qrCodeBase64: null,
        pairingCode: null,
      };
    }

    await prisma.platformWhatsappConfig.update({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      data: { connectionStatus: 'pending' },
    });

    return {
      state: connect.state,
      connectionStatus: 'pending',
      qrCodeBase64: connect.qrCodeBase64 ?? null,
      pairingCode: connect.pairingCode ?? null,
    };
  }

  /**
   * Logs out the platform WhatsApp session and marks it as disconnected.
   */
  async disconnectPlatform(): Promise<WhatsAppEvolutionConnectionDto> {
    const context = await this.loadPlatformContext();
    if (context) {
      await context.client.logoutInstance(context.instanceName).catch(() => undefined);
    }

    await prisma.platformWhatsappConfig.upsert({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      create: {
        id: PLATFORM_WHATSAPP_CONFIG_ID,
        provider: 'evolution',
        connectionStatus: 'disconnected',
      },
      update: {
        connectionStatus: 'disconnected',
        displayPhoneNumber: null,
      },
    });

    return this.readPlatformConnectionDto(context?.instanceName ?? null);
  }

  /**
   * Sends a test text message using the platform Evolution instance.
   */
  async sendPlatformTestMessage(
    phone?: string,
    text?: string,
  ): Promise<EvolutionTestMessageResponseDto> {
    const config = await prisma.platformWhatsappConfig.findUnique({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
    });
    if (!config?.instanceUrl || !config.apiKey) {
      throw new EvolutionWhatsAppError(
        'WhatsApp Evolution não provisionado. Conecte em Configurações → WhatsApp.',
        'NOT_CONFIGURED',
      );
    }

    if (config.connectionStatus !== 'connected') {
      throw new EvolutionWhatsAppError(
        'WhatsApp não conectado. Escaneie o QR ou use o código de pareamento.',
        'NOT_CONNECTED',
      );
    }

    if (!phone) {
      throw new EvolutionWhatsAppError(
        'Informe um número de teste para enviar a mensagem.',
        'NO_ACCOUNT',
      );
    }

    const targetPhone = normalizePhoneE164(phone);
    if (!targetPhone) {
      throw new EvolutionWhatsAppError('Número de telefone inválido.', 'NO_ACCOUNT');
    }

    const { baseUrl, instanceName } = parseEvolutionConnectionConfig(config.instanceUrl);
    const apiKey = safeDecryptCredential(config.apiKey) || config.apiKey;
    const provider = new EvolutionWhatsAppProvider(baseUrl, apiKey, instanceName);
    const message = text?.trim() || 'Teste PixFlow — WhatsApp Evolution conectado com sucesso.';
    const result = await provider.sendText({ phoneE164: targetPhone, text: message });

    return {
      providerMessageId: result.providerMessageId,
      sentTo: targetPhone,
    };
  }

  private async requireTenantContext(accountId: string) {
    const platform = getEvolutionPlatformConfig();
    if (!platform) {
      throw new EvolutionWhatsAppError(
        'Evolution não configurada no servidor (EVOLUTION_BASE_URL / EVOLUTION_API_KEY).',
        'NOT_CONFIGURED',
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { slug: true },
    });

    if (!account?.slug) {
      throw new EvolutionWhatsAppError('Conta sem slug configurado.', 'NO_ACCOUNT');
    }

    const instanceName = account.slug;
    const instanceUrl = buildEvolutionInstanceUrl(platform.baseUrl, instanceName);
    const client = new EvolutionAdminClient(platform.baseUrl, platform.apiKey);

    return {
      instanceName,
      instanceUrl,
      encryptedApiKey: encryptCredential(platform.apiKey),
      client,
    };
  }

  private async loadTenantContext(accountId: string) {
    try {
      return await this.requireTenantContext(accountId);
    } catch (error) {
      if (error instanceof EvolutionWhatsAppError && error.code === 'NO_ACCOUNT') {
        return null;
      }
      if (error instanceof EvolutionWhatsAppError && error.code === 'NOT_CONFIGURED') {
        return null;
      }
      throw error;
    }
  }

  private async syncFromEvolution(
    accountId: string,
    instanceName: string,
    client: EvolutionAdminClient,
  ): Promise<void> {
    const remoteState = await client.fetchConnectionState(instanceName).catch(() => 'unknown');
    const summary = await client.fetchInstanceSummary(instanceName).catch(() => null);
    const connectionStatus = mapEvolutionState(
      remoteState.toLowerCase(),
      summary?.connectionStatus?.toLowerCase(),
      toSessionSignals(summary),
    );

    const displayPhoneNumber = formatEvolutionDisplayPhone(summary?.number, summary?.ownerJid);

    await prisma.tenantWhatsappConfig.upsert({
      where: { accountId },
      create: {
        accountId,
        provider: 'evolution',
        connectionStatus,
        displayPhoneNumber,
      },
      update: {
        connectionStatus,
        ...(displayPhoneNumber ? { displayPhoneNumber } : {}),
      },
    });
  }

  private async readConnectionDto(
    accountId: string,
    fallbackInstanceName: string | null,
  ): Promise<WhatsAppEvolutionConnectionDto> {
    const row = await prisma.tenantWhatsappConfig.findUnique({ where: { accountId } });
    const instanceName =
      fallbackInstanceName ??
      (row?.instanceUrl
        ? parseEvolutionConnectionConfig(row.instanceUrl).instanceName
        : null);

    return {
      provider: 'evolution',
      connectionStatus: row?.connectionStatus ?? 'disconnected',
      instanceName,
      displayPhoneNumber: row?.displayPhoneNumber ?? null,
      instanceConfigured: Boolean(row?.instanceUrl && row.apiKey),
    };
  }

  private async requirePlatformContext() {
    const platform = getEvolutionPlatformConfig();
    if (!platform) {
      throw new EvolutionWhatsAppError(
        'Evolution não configurada no servidor (EVOLUTION_BASE_URL / EVOLUTION_API_KEY).',
        'NOT_CONFIGURED',
      );
    }

    const instanceName = PLATFORM_EVOLUTION_INSTANCE;
    const instanceUrl = buildEvolutionInstanceUrl(platform.baseUrl, instanceName);
    const client = new EvolutionAdminClient(platform.baseUrl, platform.apiKey);

    return {
      instanceName,
      instanceUrl,
      encryptedApiKey: encryptCredential(platform.apiKey),
      client,
    };
  }

  private async loadPlatformContext() {
    try {
      return await this.requirePlatformContext();
    } catch (error) {
      if (error instanceof EvolutionWhatsAppError && error.code === 'NOT_CONFIGURED') {
        return null;
      }
      throw error;
    }
  }

  private async syncPlatformFromEvolution(
    instanceName: string,
    client: EvolutionAdminClient,
  ): Promise<void> {
    const remoteState = await client.fetchConnectionState(instanceName).catch(() => 'unknown');
    const summary = await client.fetchInstanceSummary(instanceName).catch(() => null);
    const connectionStatus = mapEvolutionState(
      remoteState.toLowerCase(),
      summary?.connectionStatus?.toLowerCase(),
      toSessionSignals(summary),
    );

    const displayPhoneNumber = formatEvolutionDisplayPhone(summary?.number, summary?.ownerJid);

    await prisma.platformWhatsappConfig.upsert({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
      create: {
        id: PLATFORM_WHATSAPP_CONFIG_ID,
        provider: 'evolution',
        connectionStatus,
        displayPhoneNumber,
      },
      update: {
        connectionStatus,
        ...(displayPhoneNumber ? { displayPhoneNumber } : {}),
      },
    });
  }

  private async readPlatformConnectionDto(
    fallbackInstanceName: string | null,
  ): Promise<WhatsAppEvolutionConnectionDto> {
    const row = await prisma.platformWhatsappConfig.findUnique({
      where: { id: PLATFORM_WHATSAPP_CONFIG_ID },
    });
    const instanceName =
      fallbackInstanceName ??
      (row?.instanceUrl
        ? parseEvolutionConnectionConfig(row.instanceUrl).instanceName
        : null);

    return {
      provider: 'evolution',
      connectionStatus: row?.connectionStatus ?? 'disconnected',
      instanceName,
      displayPhoneNumber: row?.displayPhoneNumber ?? null,
      instanceConfigured: Boolean(row?.instanceUrl && row.apiKey),
    };
  }
}

function toSessionSignals(
  summary: {
    ownerJid: string | null;
    number: string | null;
  } | null,
): EvolutionSessionSignals | null {
  if (!summary) {
    return null;
  }

  return {
    ownerJid: summary.ownerJid,
    number: summary.number,
  };
}
