/**
 * Evolution API admin client (instances, QR, connection state).
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026

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

export interface EvolutionInstanceSummary {
  instanceName: string;
  connectionStatus: string | null;
  number: string | null;
  ownerJid: string | null;
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
  async getConnectInfo(instanceName: string, phone?: string): Promise<EvolutionConnectInfo> {
    const query = phone ? `?number=${encodeURIComponent(phone)}` : '';
    const url = `${this.baseUrl}/instance/connect/${encodeURIComponent(instanceName)}${query}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers() });
    const text = await response.text();
    const payload = safeJson(text) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        (payload.message as string) || `Evolution connect failed (${response.status})`,
      );
    }

    const instanceBlock = payload.instance as Record<string, unknown> | undefined;
    const qrcodeBlock = payload.qrcode as Record<string, unknown> | undefined;
    const qrBlock = payload.qr as Record<string, unknown> | undefined;

    const base64 =
      (payload.base64 as string) ||
      (qrcodeBlock?.base64 as string) ||
      (qrBlock?.base64 as string);

    const pairingCode = (payload.pairingCode as string) ?? undefined;

    return {
      instanceName,
      state: String(instanceBlock?.state ?? payload.state ?? payload.status ?? 'unknown'),
      qrCodeBase64: base64,
      pairingCode,
    };
  }

  /**
   * Logs out the WhatsApp session for an instance.
   */
  async logoutInstance(instanceName: string): Promise<void> {
    const url = `${this.baseUrl}/instance/logout/${encodeURIComponent(instanceName)}`;
    const response = await fetch(url, { method: 'DELETE', headers: this.headers() });
    if (response.ok || response.status === 404) {
      return;
    }

    const text = await response.text();
    const payload = safeJson(text);
    throw new Error(
      (payload.message as string) || `Evolution logout failed (${response.status})`,
    );
  }

  /**
   * Returns summary data for a single instance from the Evolution server.
   */
  async fetchInstanceSummary(instanceName: string): Promise<EvolutionInstanceSummary | null> {
    const url = `${this.baseUrl}/instance/fetchInstances`;
    const response = await fetch(url, { method: 'GET', headers: this.headers() });
    const text = await response.text();
    const payload = safeJson(text);

    if (!response.ok) {
      throw new Error(
        (payload.message as string) || `Evolution fetchInstances failed (${response.status})`,
      );
    }

    const items = Array.isArray(payload)
      ? payload
      : ((payload.response as unknown[]) ?? []);

    const row = items.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        ((item as Record<string, unknown>).name === instanceName ||
          (item as Record<string, unknown>).instanceName === instanceName),
    ) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      instanceName,
      connectionStatus: String(row.connectionStatus ?? row.state ?? '') || null,
      number: (row.number as string) ?? null,
      ownerJid: (row.ownerJid as string) ?? null,
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
