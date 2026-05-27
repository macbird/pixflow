export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum UserRole {
  TENANT_OWNER = 'tenant_owner',
  TENANT_ADMIN = 'tenant_admin',
  TENANT_OPERATOR = 'tenant_operator',
  TENANT_VIEWER = 'tenant_viewer',
}

export enum CustomerStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  OVERDUE = 'overdue',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum ConnectionStatus {
  ACTIVE = 'active',
  TEST = 'test',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial',
}

export enum PaymentMethod {
  PIX = 'pix',
  CASH = 'cash',
  TRANSFER = 'transfer',
  OTHER = 'other',
}

export enum RenewalStatus {
  PENDING_SERVER_RENEWAL = 'pending_server_renewal',
  RENEWED_ON_SERVER = 'renewed_on_server',
  CANCELLED = 'cancelled',
}
