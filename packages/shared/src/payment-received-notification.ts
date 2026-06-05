/**
 * Builds WhatsApp notification text when a tenant invoice is paid.
 */
export function buildPaymentReceivedNotificationMessage(params: {
  accountName: string;
  customerName?: string | null;
  amountCents: number;
  billingCycleKey: string;
  method: string;
  source?: string | null;
  activationTasksCreated?: number;
}): string {
  const amount = (params.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const methodLabel = params.method.toUpperCase();
  const sourceLabel = params.source ? ` (${params.source})` : '';
  const customerLine = params.customerName
    ? `Cliente: ${params.customerName}`
    : 'Cliente: —';

  const lines = [
    `✅ Pagamento recebido — ${params.accountName}`,
    '',
    customerLine,
    `Valor: ${amount}`,
    `Ciclo: ${params.billingCycleKey}`,
    `Forma: ${methodLabel}${sourceLabel}`,
  ];

  if (params.activationTasksCreated && params.activationTasksCreated > 0) {
    lines.push(
      '',
      `Ativações pendentes: ${params.activationTasksCreated}`,
    );
  }

  return lines.join('\n');
}
