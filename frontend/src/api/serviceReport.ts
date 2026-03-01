import api from '@/lib/api';

export interface ServiceReport {
  id: string;
  serviceId: string;
  companyId: string;
  workDone: string;
  findings: string | null;
  partsUsed: string | null;
  reportDate: string;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
}

export interface ServiceReportInput {
  workDone: string;
  findings?: string;
  partsUsed?: string;
  reportDate?: string;
  status?: string;
}

export const serviceReportApi = {
  get: (serviceId: string) =>
    api.get<{ success: boolean; data: ServiceReport | null }>(`/services/${serviceId}/report`),

  upsert: (serviceId: string, data: ServiceReportInput) =>
    api.put<{ success: boolean; data: ServiceReport }>(`/services/${serviceId}/report`, data),
};
