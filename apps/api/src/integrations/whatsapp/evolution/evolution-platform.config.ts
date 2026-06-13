/**
 * Platform-level Evolution API configuration from environment variables.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 10/06/2026

 */

export interface EvolutionPlatformConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * Returns Evolution base URL and global API key when configured on the server.
 */
export function getEvolutionPlatformConfig(): EvolutionPlatformConfig | null {
  const baseUrl = process.env.EVOLUTION_BASE_URL?.trim().replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}
