import api from '@/lib/api';

export interface DevTask {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  reportedAt: string;
  completedAt?: string | null;
  createdByName?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface DevTaskInput {
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  reportedAt?: string;
  completedAt?: string | null;
}

export const devTasksApi = {
  list: () => api.get<{ success: boolean; data: DevTask[] }>('/dev-tasks'),
  create: (data: DevTaskInput) => api.post<{ success: boolean; data: DevTask }>('/dev-tasks', data),
  update: (id: string, data: Partial<DevTaskInput>) => api.put<{ success: boolean; data: DevTask }>(`/dev-tasks/${id}`, data),
  delete: (id: string) => api.delete(`/dev-tasks/${id}`),
};
