import type { CustomerStatusValue } from './customer-status';

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: CustomerStatusValue;
  expiresAt: string | null;
  plan: { id: string; name: string } | null;
  tags: { id: string; name: string; color: string | null }[];
  connectionCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface PlatformSettingsDto {
  defaultPlan: {
    id: string;
    name: string;
    priceCents: number;
    billingCycle: string;
  };
  payment: {
    provider: string;
    apiKeyConfigured: boolean;
    webhookTokenConfigured: boolean;
    overdueDays: number;
  };
  whatsapp: {
    provider: string;
    instanceUrl: string | null;
    apiKeyConfigured: boolean;
  };
}

export interface TenantSettingsDto {
  payment: {
    provider: string;
    apiKeyConfigured: boolean;
    webhookTokenConfigured: boolean;
  };
  paymentCredentials: TenantPaymentCredentialDto[];
  paymentRouting: TenantPaymentRoutingRuleDto[];
  whatsapp: {
    provider: string;
    instanceUrl: string | null;
    apiKeyConfigured: boolean;
  };
  subscription: TenantSubscriptionDto | null;
}

export interface TenantPaymentCredentialDto {
  provider: string;
  apiKeyConfigured: boolean;
  webhookTokenConfigured: boolean;
  active: boolean;
}

export interface TenantPaymentRoutingRuleDto {
  id: string;
  minAmountCents: number;
  provider: string;
  sortOrder: number;
  active: boolean;
}

export interface PaymentRoutingPreviewDto {
  amountCents: number;
  provider: string;
}

export interface TenantSubscriptionDto {
  planName: string;
  priceCents: number;
  billingCycle: string;
  dueDay: number;
  status: string;
  nextDueDate: string | null;
}

export interface InvoiceListItem {
  id: string;
  scope: 'platform' | 'tenant';
  billingCycleKey: string;
  amountCents: number;
  dueDate: string;
  status: string;
  pixCopyPaste: string | null;
  paidAt: string | null;
  account?: { id: string; name: string };
  customer?: { id: string; name: string } | null;
}

export interface PaymentListItem {
  id: string;
  amountCents: number;
  method: string;
  paidAt: string;
  invoice: {
    id: string;
    billingCycleKey: string;
    scope: string;
    accountName?: string;
    customerName?: string | null;
  };
}

export interface InvoicePaymentSummary {
  id: string;
  amountCents: number;
  method: string;
  paidAt: string;
  providerPaymentId: string | null;
}

export interface InvoiceReplacementRef {
  id: string;
  status: string;
  amountCents?: number;
}

export interface InvoiceDetailDto {
  id: string;
  scope: 'platform' | 'tenant';
  billingCycleKey: string;
  amountCents: number;
  dueDate: string;
  status: string;
  pixCopyPaste: string | null;
  paidAt: string | null;
  paymentProvider: string | null;
  providerChargeId: string | null;
  createdAt: string;
  updatedAt: string;
  canceledAt: string | null;
  cancelReason: string | null;
  replacesInvoiceId: string | null;
  account?: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  payments: InvoicePaymentSummary[];
  replacesInvoice: InvoiceReplacementRef | null;
  replacement: InvoiceReplacementRef | null;
  canCancel: boolean;
  canRecreate: boolean;
}

export interface PaymentDetailDto {
  id: string;
  amountCents: number;
  method: string;
  paidAt: string;
  providerPaymentId: string | null;
  createdAt: string;
  invoice: {
    id: string;
    billingCycleKey: string;
    scope: string;
    amountCents: number;
    dueDate: string;
    status: string;
    pixCopyPaste: string | null;
    paidAt: string | null;
    account?: { id: string; name: string };
    customer?: { id: string; name: string } | null;
  };
}

export interface AccountListItem {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    passwordResetRequired: boolean;
  }>;
}
