import api from '@/lib/api';
import type { ServiceType } from '@/types';

export const serviceTypesApi = {
  list: () => api.get<{ success: boolean; data: ServiceType[] }>('/service-types'),
  create: (data: {
    nameEn: string; nameTr: string; code: string;
    category?: string; description?: string; isGlobal?: boolean;
  }) => api.post<{ success: boolean; data: ServiceType }>('/service-types', data),
  update: (id: number, data: Partial<{ nameEn: string; nameTr: string; code: string; category: string; description: string }>) =>
    api.put<{ success: boolean; data: ServiceType }>(`/service-types/${id}`, data),
  delete: (id: number) => api.delete(`/service-types/${id}`),
};
