import { api } from '../../../shared/api/api.client';

export const adminAuthApi = {
  login: async (credentials: any) => {
    const response = await api.post('/admin/auth/login', credentials);
    return response.data;
  },
};

export const tenantsApi = {
  list: async () => {
    const response = await api.get('/admin/tenants');
    return response.data;
  },
  create: async (data: { name: string, slug: string }) => {
    const response = await api.post('/admin/tenants', data);
    return response.data;
  },
  toggleStatus: async (id: string, status: 'active' | 'suspended') => {
    const response = await api.patch(`/admin/tenants/${id}/status`, { status });
    return response.data;
  },
};

export const adminDashboardApi = {
  getStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
};
