import { api } from '../../../shared/api/api.client';
import type { AccountListItem, PaginatedResponse } from '@client-manager/shared';

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
  create: async (data: {
    name: string;
    slug?: string;
    ownerName: string;
    ownerEmail: string;
    initialPassword?: string;
  }) => {
    const response = await api.post('/admin/tenants', data);
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

export const adminDashboardApi = {
  getStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
};
