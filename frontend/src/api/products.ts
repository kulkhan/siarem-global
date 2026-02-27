import api from '@/lib/api';
import type { Product } from '@/types';

export const productsApi = {
  list: () => api.get<{ success: boolean; data: Product[] }>('/products'),
  create: (data: Partial<Product>) => api.post<{ success: boolean; data: Product }>('/products', data),
  update: (id: string, data: Partial<Product>) => api.put<{ success: boolean; data: Product }>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};
