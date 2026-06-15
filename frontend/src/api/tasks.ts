import api from '@/lib/api';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  assignedUserId?: string;
  assignedUserIds: string[];
  assignedUsers?: { id: string; name: string }[];
  category?: string | null;
  meetingId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  closedNote?: string | null;
  closedById?: string | null;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  assignedUser?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  meeting?: { id: string; title: string; meetingDate: string };
}

export interface TaskInput {
  title: string;
  description?: string;
  assignedUserId?: string;
  assignedUserIds?: string[];
  category?: string;
  meetingId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface TaskListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedUserId?: string;
  meetingId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const tasksApi = {
  list: (params?: TaskListParams) =>
    api.get<{ success: boolean; data: Task[]; total: number; page: number; pageSize: number }>(
      '/tasks', { params }
    ),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Task }>(`/tasks/${id}`),

  create: (data: TaskInput) =>
    api.post<{ success: boolean; data: Task }>('/tasks', data),

  update: (id: string, data: Partial<TaskInput> & { status?: TaskStatus; completedAt?: string | null }) =>
    api.put<{ success: boolean; data: Task }>(`/tasks/${id}`, data),

  close: (id: string, note?: string) =>
    api.post<{ success: boolean; data: Task }>(`/tasks/${id}/close`, { note }),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/tasks/${id}`),

  getCategories: () =>
    api.get<{ success: boolean; data: string[] }>('/tasks/categories'),
};
