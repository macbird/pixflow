export interface AutomationChargeReportEntry {
  customerName: string;
  phoneMasked: string;
  billingCycleKey: string;
  amountCents: number;
  dueDate: string | Date;
  messagesCount: number;
}

/**
 * Builds WhatsApp report text listing automatic charge deliveries for a tenant run.
 */
export function buildBillingAutomationReportMessage(params: {
  tenantName: string;
  runAt: Date;
  charges: AutomationChargeReportEntry[];
  customersScanned: number;
  chargesSkipped: number;
  invoicesCreated: number;
  errorsCount: number;
}): string {
  const runLabel = params.runAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const lines = [
    `📋 Automação de cobrança — ${params.tenantName}`,
    `Execução: ${runLabel}`,
    '',
    `Clientes na janela: ${params.customersScanned}`,
    `Faturas criadas: ${params.invoicesCreated}`,
    `Cobranças ignoradas: ${params.chargesSkipped}`,
  ];

  if (params.errorsCount > 0) {
    lines.push(`Erros: ${params.errorsCount}`);
  }

  lines.push('');

  if (params.charges.length === 0) {
    lines.push('Nenhuma cobrança WhatsApp enviada nesta execução.');
    return lines.join('\n');
  }

  lines.push(`Cobranças enviadas (${params.charges.length}):`);

  params.charges.forEach((charge, index) => {
    const amount = (charge.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const due =
      charge.dueDate instanceof Date
        ? charge.dueDate.toLocaleDateString('pt-BR')
        : new Date(charge.dueDate).toLocaleDateString('pt-BR');

    lines.push(
      '',
      `${index + 1}. ${charge.customerName} (${charge.phoneMasked})`,
      `   ${charge.billingCycleKey} · ${amount} · venc. ${due}`,
      `   ${charge.messagesCount} msg(s) via WhatsApp`,
    );
  });

  return lines.join('\n');
}
