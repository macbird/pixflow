import { api } from '../../../shared/api/api.client';
import { PlanInput } from '@iptv-manager/shared';

export const plansApi = {
  list: async () => {
    const response = await api.get('/plans');
    return response.data;
  },
  create: async (data: PlanInput) => {
    const response = await api.post('/plans', data);
    return response.data;
  },
  update: async (id: string, data: PlanInput) => {
    const response = await api.put(`/plans/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/plans/${id}`);
    return response.data;
  },
};
