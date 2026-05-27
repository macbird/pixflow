import { api } from '../../../shared/api/api.client';
import { TagInput } from '@iptv-manager/shared';

export const tagsApi = {
  list: async () => {
    const response = await api.get('/tags');
    return response.data;
  },
  create: async (data: TagInput) => {
    const response = await api.post('/tags', data);
    return response.data;
  },
  update: async (id: string, data: TagInput) => {
    const response = await api.put(`/tags/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/tags/${id}`);
    return response.data;
  },
};
