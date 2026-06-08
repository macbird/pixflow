import type { BillingInvoiceStatus } from '@prisma/client';

/** Display order: Vencida → Em aberto → Paga → Rascunho → Cancelada */
export const INVOICE_STATUS_SORT_ORDER: Record<BillingInvoiceStatus, number> = {
  overdue: 1,
  open: 2,
  paid: 3,
  draft: 4,
  canceled: 5,
};

export function compareInvoicesByStatusThenDueDate(
  a: { status: BillingInvoiceStatus; dueDate: Date },
  b: { status: BillingInvoiceStatus; dueDate: Date },
): number {
  const statusDiff = INVOICE_STATUS_SORT_ORDER[a.status] - INVOICE_STATUS_SORT_ORDER[b.status];
  if (statusDiff !== 0) {
    return statusDiff;
  }

  return b.dueDate.getTime() - a.dueDate.getTime();
}
