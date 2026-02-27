import api from '@/lib/api';

export type MeetingType = 'MEETING' | 'CALL';

export interface Meeting {
  id: string;
  customerId: string;
  shipId?: string;
  createdById?: string;
  meetingType: MeetingType;
  title: string;
  description?: string;
  location?: string;
  duration?: number;
  meetingDate: string;
  followUpDate?: string;
  attendees?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; shortCode: string };
  ship?: { id: string; name: string; imoNumber?: string };
  createdBy?: { id: string; name: string };
}

export interface MeetingListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  meetingType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MeetingListResponse {
  data: Meeting[];
  total: number;
  page: number;
  pageSize: number;
}

export const meetingsApi = {
  list: (params: MeetingListParams) =>
    api.get<MeetingListResponse & { success: boolean }>('/meetings', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Meeting }>(`/meetings/${id}`),

  create: (data: Partial<Meeting>) =>
    api.post<{ success: boolean; data: Meeting }>('/meetings', data),

  update: (id: string, data: Partial<Meeting>) =>
    api.put<{ success: boolean; data: Meeting }>(`/meetings/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/meetings/${id}`),
};
