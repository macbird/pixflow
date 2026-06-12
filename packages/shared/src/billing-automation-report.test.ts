import { describe, expect, it } from 'vitest';
import { buildBillingAutomationReportMessage } from './billing-automation-report';

describe('buildBillingAutomationReportMessage', () => {
  it('lists automatic charges sent to customers', () => {
    const message = buildBillingAutomationReportMessage({
      tenantName: 'Toro TV',
      runAt: new Date('2026-06-10T20:00:00.000Z'),
      customersScanned: 2,
      chargesSkipped: 1,
      invoicesCreated: 1,
      errorsCount: 0,
      charges: [
        {
          customerName: 'Ana Maria',
          phoneMasked: '5535****54',
          billingCycleKey: '2026-06',
          amountCents: 3500,
          dueDate: '2026-06-12',
          messagesCount: 2,
        },
      ],
    });

    expect(message).toContain('Toro TV');
    expect(message).toContain('Cobranças enviadas (1)');
    expect(message).toContain('Ana Maria');
    expect(message).toMatch(/R\$\s?35,00/);
    expect(message).toContain('2 msg(s) via WhatsApp');
  });

  it('reports when no charges were sent', () => {
    const message = buildBillingAutomationReportMessage({
      tenantName: 'Toro TV',
      runAt: new Date('2026-06-10T20:00:00.000Z'),
      customersScanned: 1,
      chargesSkipped: 1,
      invoicesCreated: 0,
      errorsCount: 0,
      charges: [],
    });

    expect(message).toContain('Nenhuma cobrança WhatsApp enviada nesta execução.');
  });

  it('includes overdue reminder section when provided', () => {
    const message = buildBillingAutomationReportMessage({
      tenantName: 'Toro TV',
      runAt: new Date('2026-06-10T20:00:00.000Z'),
      customersScanned: 0,
      chargesSkipped: 0,
      invoicesCreated: 0,
      errorsCount: 1,
      charges: [],
      overdueReminders: {
        sent: [
          {
            customerName: 'João Silva',
            phoneMasked: '5535****54',
            windowDaysAfterDue: 1,
            amountCents: 3500,
            dueDate: '2026-06-09',
            messagesCount: 2,
          },
        ],
        failed: [
          {
            customerName: 'Maria',
            windowDaysAfterDue: 7,
            reason: 'Telefone inválido',
          },
        ],
        skippedBlocked: 2,
        skippedNoPix: 1,
      },
    });

    expect(message).toContain('Lembretes pós-vencimento:');
    expect(message).toContain('D+1: 1');
    expect(message).toContain('Maria (D+7): Telefone inválido');
    expect(message).toContain('bloqueado: 2 | sem PIX: 1');
  });
});
