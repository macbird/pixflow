/**
 * Errors raised by payment provider adapters and generation flow.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly provider?: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
