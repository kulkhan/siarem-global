import api from '@/lib/api';
import axios from 'axios';

export type ComplaintType = 'COMPLAINT' | 'FEEDBACK' | 'SUGGESTION';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  id: string;
  companyId: string;
  customerId?: string;
  type: ComplaintType;
  status: ComplaintStatus;
  subject: string;
  description: string;
  responseNote?: string;
  respondedAt?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  contactName?: string;
  contactEmail?: string;
  customer?: { id: string; name: string; shortCode: string };
}

export const complaintsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<{ success: boolean; data: Complaint[]; total: number; page: number; pageSize: number }>('/complaints', { params }),
  getOne: (id: string) =>
    api.get<{ success: boolean; data: Complaint }>(`/complaints/${id}`),
  create: (data: Partial<Complaint>) =>
    api.post<{ success: boolean; data: Complaint }>('/complaints', data),
  update: (id: string, data: Partial<Complaint>) =>
    api.put<{ success: boolean; data: Complaint }>(`/complaints/${id}`, data),
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/complaints/${id}`),
};

// Public submission — no auth header needed
export function submitPublicComplaint(data: {
  companySlug: string;
  subject: string;
  description: string;
  type?: ComplaintType;
  contactName?: string;
  contactEmail?: string;
  recaptchaToken?: string;
}) {
  return axios.post('/api/complaints/public', data);
}
