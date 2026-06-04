export interface PaymentMessageInvoice {
  pixCopyPaste: string | null;
  checkoutUrl?: string | null;
  paymentDeliveryType?: 'emv' | 'checkout_link' | null;
  amountCents: number;
  billingCycleKey: string;
  dueDate: string | Date;
}

/**
 * Returns the payment block text for WhatsApp or UI copy.
 */
export function buildPaymentWhatsAppBlock(invoice: PaymentMessageInvoice): string {
  if (invoice.paymentDeliveryType === 'checkout_link' && invoice.checkoutUrl) {
    return `Pague aqui (PIX ou cartão):\n${invoice.checkoutUrl}`;
  }
  if (invoice.pixCopyPaste) {
    return `PIX copia e cola:\n${invoice.pixCopyPaste}`;
  }
  return 'Pagamento ainda não gerado para esta fatura.';
}

/**
 * Formats a full billing reminder message for WhatsApp.
 */
export function buildBillingChargeMessage(params: {
  payerName: string;
  invoice: PaymentMessageInvoice;
}): string {
  const amount = (params.invoice.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const due =
    params.invoice.dueDate instanceof Date
      ? params.invoice.dueDate.toLocaleDateString('pt-BR')
      : new Date(params.invoice.dueDate).toLocaleDateString('pt-BR');

  const paymentBlock = buildPaymentWhatsAppBlock(params.invoice);

  return [
    `Olá, ${params.payerName}!`,
    '',
    `Sua cobrança referente ao ciclo ${params.invoice.billingCycleKey} está disponível.`,
    `Valor: ${amount}`,
    `Vencimento: ${due}`,
    '',
    paymentBlock,
  ].join('\n');
}
