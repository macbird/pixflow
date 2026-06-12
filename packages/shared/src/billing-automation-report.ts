export interface AutomationChargeReportEntry {
  customerName: string;
  phoneMasked: string;
  billingCycleKey: string;
  amountCents: number;
  dueDate: string | Date;
  messagesCount: number;
}

export interface OverdueReminderReportEntry {
  customerName: string;
  phoneMasked: string;
  windowDaysAfterDue: number;
  amountCents: number;
  dueDate: string | Date;
  messagesCount: number;
}

export interface OverdueReminderErrorEntry {
  customerName: string;
  windowDaysAfterDue: number;
  reason: string;
}

export interface OverdueReminderRunSummary {
  sent: OverdueReminderReportEntry[];
  failed: OverdueReminderErrorEntry[];
  skippedBlocked: number;
  skippedNoPix: number;
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
  overdueReminders?: OverdueReminderRunSummary;
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
  } else {
    lines.push(`Cobranças enviadas (${params.charges.length}):`);

    params.charges.forEach((charge, index) => {
      lines.push('', formatChargeEntry(index + 1, charge));
    });
  }

  if (params.overdueReminders) {
    lines.push('', ...buildOverdueReminderReportSection(params.overdueReminders));
  }

  return lines.join('\n');
}

function formatChargeEntry(index: number, charge: AutomationChargeReportEntry): string {
  const amount = (charge.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const due =
    charge.dueDate instanceof Date
      ? charge.dueDate.toLocaleDateString('pt-BR')
      : new Date(charge.dueDate).toLocaleDateString('pt-BR');

  return [
    `${index}. ${charge.customerName} (${charge.phoneMasked})`,
    `   ${charge.billingCycleKey} · ${amount} · venc. ${due}`,
    `   ${charge.messagesCount} msg(s) via WhatsApp`,
  ].join('\n');
}

function buildOverdueReminderReportSection(summary: OverdueReminderRunSummary): string[] {
  const sentByWindow = countByWindow(summary.sent);
  const lines = [
    'Lembretes pós-vencimento:',
    `  Enviados: ${formatWindowCounts(sentByWindow)}`,
    `  Falhas: ${summary.failed.length}`,
  ];

  summary.failed.forEach((entry) => {
    lines.push(`  - ${entry.customerName} (D+${entry.windowDaysAfterDue}): ${entry.reason}`);
  });

  lines.push(
    `  Ignorados: bloqueado: ${summary.skippedBlocked} | sem PIX: ${summary.skippedNoPix}`,
  );

  return lines;
}

function countByWindow(entries: OverdueReminderReportEntry[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    counts.set(entry.windowDaysAfterDue, (counts.get(entry.windowDaysAfterDue) ?? 0) + 1);
  }
  return counts;
}

function formatWindowCounts(counts: Map<number, number>): string {
  if (counts.size === 0) {
    return 'nenhum';
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([window, count]) => `D+${window}: ${count}`)
    .join(' | ');
}
