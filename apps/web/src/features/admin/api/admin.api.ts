import { api } from '../../../shared/api/api.client';
import type { AccountListItem, PaginatedResponse } from '@client-manager/shared';
import type {
  CreateTenantAccountInput,
  UpdateTenantAccountInput,
} from '@client-manager/shared';
import type { BillingSnapshot } from '../../dashboard/api/dashboard.api';
import type { MonthlyBillingPoint } from '../../../shared/ui/billing/BillingMonthlyBars';
import type { RecentPaymentItem } from '../../../shared/ui/billing/RecentPaymentsList';

export const adminAuthApi = {
  login: async (credentials: any) => {
    const response = await api.post('/admin/auth/login', credentials);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/admin/auth/me');
    return response.data;
  },
  updateProfile: async (data: { email?: string, password?: string }) => {
    const response = await api.patch('/admin/auth/me', data);
    return response.data;
  },
};

export const tenantsApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    filter: string;
  }): Promise<PaginatedResponse<AccountListItem>> => {
    const response = await api.get('/admin/tenants', { params });
    return response.data;
  },
  getById: async (id: string): Promise<AccountListItem> => {
    const response = await api.get(`/admin/tenants/${id}`);
    return response.data;
  },
  create: async (data: CreateTenantAccountInput) => {
    const response = await api.post('/admin/tenants', data);
    return response.data;
  },
  update: async (id: string, data: UpdateTenantAccountInput) => {
    const response = await api.patch(`/admin/tenants/${id}`, data);
    return response.data;
  },
  generateInvoice: async (id: string) => {
    const response = await api.post(`/admin/tenants/${id}/invoices`);
    return response.data;
  },
  toggleStatus: async (id: string, status: 'active' | 'suspended') => {
    const response = await api.patch(`/admin/tenants/${id}/status`, { status });
    return response.data;
  },
  resetPassword: async (email: string, newPassword?: string) => {
    const response = await api.post(`/admin/tenants/reset-password`, { email, newPassword });
    return response.data;
  },
};

export interface AdminDashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  totalUsers: number;
  expectedMrrCents: number;
  activeSubscriptions: number;
  billing: BillingSnapshot;
  monthlyBilling: MonthlyBillingPoint[];
  recentPayments: RecentPaymentItem[];
}

export const adminDashboardApi = {
  getStats: async (): Promise<AdminDashboardStats> => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
};
