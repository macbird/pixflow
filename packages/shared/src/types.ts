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
