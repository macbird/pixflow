import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const isAdminRoute = url.startsWith('/admin');
  const token = isAdminRoute
    ? localStorage.getItem('adminToken')
    : localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const url = error.config?.url ?? '';
    const isLoginRequest =
      url.includes('/auth/login') || url.endsWith('/login');
    if (isLoginRequest) {
      return Promise.reject(error);
    }

    const isAdminRoute = url.startsWith('/admin');
    const loginPath = isAdminRoute ? '/admin/login' : '/login';
    const storageKey = isAdminRoute ? 'adminToken' : 'token';

    localStorage.removeItem(storageKey);

    if (!window.location.pathname.startsWith(loginPath)) {
      window.location.href = loginPath;
    }

    return Promise.reject(error);
  },
);
