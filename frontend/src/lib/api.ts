/**
 * Centralised Axios instance for all API calls.
 * Every request automatically receives:
 *  - Authorization: Bearer <JWT from localStorage>
 *  - X-Tenant-Domain: window.location.hostname (for tenant resolution)
 *  - X-Selected-Company: active tenant ID when SUPER_ADMIN selects a company
 * A global 401 interceptor clears auth state and redirects to /login,
 * except for /auth/* endpoints which handle errors in-page.
 */
import axios from 'axios';
import { useTenantStore } from '@/store/tenant.store';
import { useAuthStore } from '@/store/auth.store';

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
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
