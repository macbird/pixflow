import { api } from '../../../shared/api/api.client';
import { LoginInput, RegisterInput } from '@iptv-manager/shared';

export const authApi = {
  login: async (data: LoginInput) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  register: async (data: RegisterInput) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
