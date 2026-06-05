/**
 * Parses Evolution base URL and instance name from stored tenant config.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

export interface EvolutionConnectionConfig {
  baseUrl: string;
  instanceName: string;
}

/**
 * Resolves Evolution API base URL and instance name.
 * Supports `http://host:8080/tenant-slug` (path = instance) or plain base URL + EVOLUTION_INSTANCE_NAME.
 */
export function parseEvolutionConnectionConfig(instanceUrl: string): EvolutionConnectionConfig {
  const fromEnv = process.env.EVOLUTION_INSTANCE_NAME?.trim();

  try {
    const url = new URL(instanceUrl);
    const pathSegment = url.pathname.replace(/^\/|\/$/g, '');
    const instanceName =
      fromEnv || (pathSegment && !pathSegment.includes('/') ? pathSegment : 'default');
    return { baseUrl: url.origin, instanceName };
  } catch {
    const trimmed = instanceUrl.replace(/\/$/, '');
    return { baseUrl: trimmed, instanceName: fromEnv || 'default' };
  }
}

/**
 * Builds the value stored in `tenant_whatsapp_config.instance_url`.
 */
export function buildEvolutionInstanceUrl(baseUrl: string, instanceName: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${encodeURIComponent(instanceName)}`;
}
