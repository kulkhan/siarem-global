import api from '@/lib/api';
import type { User } from '@/types';

export const usersApi = {
  list: () => api.get<{ success: boolean; data: User[] }>('/users'),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<{ success: boolean; data: User }>('/users', data),
  update: (id: string, data: Partial<{ name: string; email: string; role: string; isActive: boolean; password: string }>) =>
    api.put<{ success: boolean; data: User }>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  changePassword: (id: string, newPassword: string) =>
    api.put(`/users/${id}/password`, { newPassword }),
};
