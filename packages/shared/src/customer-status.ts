import { CustomerStatus } from './enums';

/** Values accepted by API and forms (matches Prisma CustomerStatus). */
export const CUSTOMER_STATUS_VALUES = [
  CustomerStatus.ACTIVE,
  CustomerStatus.TRIAL,
  CustomerStatus.OVERDUE,
  CustomerStatus.BLOCKED,
  CustomerStatus.CANCELLED,
] as const;

export type CustomerStatusValue = (typeof CUSTOMER_STATUS_VALUES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatusValue, string> = {
  [CustomerStatus.ACTIVE]: 'Ativo',
  [CustomerStatus.TRIAL]: 'Teste',
  [CustomerStatus.OVERDUE]: 'Vencido',
  [CustomerStatus.BLOCKED]: 'Bloqueado',
  [CustomerStatus.CANCELLED]: 'Cancelado',
};

export const CUSTOMER_STATUS_BADGE_CLASSES: Record<CustomerStatusValue, string> = {
  [CustomerStatus.ACTIVE]: 'bg-green-100 text-green-700',
  [CustomerStatus.TRIAL]: 'bg-amber-100 text-amber-700',
  [CustomerStatus.OVERDUE]: 'bg-red-100 text-red-700',
  [CustomerStatus.BLOCKED]: 'bg-slate-100 text-slate-700',
  [CustomerStatus.CANCELLED]: 'bg-slate-100 text-slate-500',
};

export function getCustomerStatusLabel(status: string): string {
  return CUSTOMER_STATUS_LABELS[status as CustomerStatusValue] ?? status;
}

export function getCustomerStatusBadgeClass(status: string): string {
  return CUSTOMER_STATUS_BADGE_CLASSES[status as CustomerStatusValue] ?? 'bg-slate-100 text-slate-700';
}
