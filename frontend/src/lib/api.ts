import axios from 'axios';
import { useTenantStore } from '@/store/tenant.store';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token + tenant domain + selected company to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Tenant-Domain'] = window.location.hostname;

  // SUPER_ADMIN: forward selected company for server-side filtering
  const selectedCompanyId = useTenantStore.getState().selectedCompanyId;
  if (selectedCompanyId) {
    config.headers['X-Selected-Company'] = selectedCompanyId;
  }

  return config;
});

// Handle 401 globally — redirect to login (but NOT for auth endpoints, those show error in-page)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthEndpoint = (error.config?.url as string | undefined)?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
