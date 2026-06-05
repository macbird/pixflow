/**
 * Evolution API admin client (instances, QR, connection state).
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

export interface EvolutionInstanceCreateInput {
  instanceName: string;
  token?: string;
}

export interface EvolutionConnectInfo {
  instanceName: string;
  state: string;
  qrCodeBase64?: string;
  pairingCode?: string;
}

export class EvolutionAdminClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  /**
   * Creates a WhatsApp instance on the Evolution server (idempotent if already exists).
   */
  async ensureInstance(input: EvolutionInstanceCreateInput): Promise<void> {
    const state = await this.fetchConnectionState(input.instanceName).catch(() => null);
    if (state) return;

    const url = `${this.baseUrl}/instance/create`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        instanceName: input.instanceName,
        token: input.token ?? input.instanceName,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    const text = await response.text();
    if (response.ok) return;

    const message = parseEvolutionError(text);
    if (response.status === 409 || /already exists/i.test(message)) return;

    throw new Error(message || `Evolution create instance failed (${response.status})`);
  }

  /**
   * Returns QR / pairing data to link WhatsApp on the instance.
   */
  async getConnectInfo(instanceName: string): Promise<EvolutionConnectInfo> {
    const url = `${this.baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers() });
    const text = await response.text();
    const payload = safeJson(text) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        (payload.message as string) || `Evolution connect failed (${response.status})`,
      );
    }

    const base64 =
      (payload.base64 as string) ||
      (payload.qrcode as { base64?: string })?.base64 ||
      (payload.qr as { base64?: string })?.base64;

    return {
      instanceName,
      state: String(payload.state ?? payload.status ?? 'unknown'),
      qrCodeBase64: base64,
      pairingCode: payload.pairingCode as string | undefined,
    };
  }

  /**
   * Reads WhatsApp connection state for an instance.
   */
  async fetchConnectionState(instanceName: string): Promise<string> {
    const url = `${this.baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers() });
    const text = await response.text();
    const payload = safeJson(text) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        (payload.message as string) || `Evolution connectionState failed (${response.status})`,
      );
    }

    const instance = payload.instance as { state?: string } | undefined;
    return String(instance?.state ?? payload.state ?? 'unknown');
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey,
    };
  }
}

function safeJson(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseEvolutionError(text: string): string {
  const payload = safeJson(text);
  return String(payload.message ?? payload.error ?? text).slice(0, 500);
}
