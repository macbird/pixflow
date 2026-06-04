/**
 * WhatsApp provider contract for outbound billing messages.
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 04/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultoria de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */

export interface SendMessageInput {
  phoneE164: string;
  text: string;
}

export interface WhatsAppProvider {
  sendText(input: SendMessageInput): Promise<{ providerMessageId: string }>;
}
