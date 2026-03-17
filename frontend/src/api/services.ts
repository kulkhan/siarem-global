import api from '@/lib/api';

export interface ServiceType {
  id: number;
  nameEn: string;
  nameTr: string;
  code: string;
  category?: string;
}

export interface ServiceInvoice {
  id: string;
  refNo?: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  sentAt?: string;
  invoiceDate: string;
  isCombined: boolean;
}

export interface ServiceLog {
  id: string;
  serviceId: string;
  userId?: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface Service {
  id: string;
  customerId: string;
  shipId?: string;
  serviceTypeId?: number;
  assignedUserId?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  invoiceReady: boolean;
  invoiceReadyNote?: string;
  euMrvMpStatus?: string;
  ukMrvMpStatus?: string;
  fuelEuMpStatus?: string;
  imoDcsStatus?: string;
  euEtsStatus?: string;
  mohaStatus?: string;
  statusNote?: string;
  notes?: string;
  startDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; shortCode: string };
  ship?: { id: string; name: string; imoNumber?: string };
  serviceType?: ServiceType;
  assignedUser?: { id: string; name: string };
  invoices?: ServiceInvoice[];
  logs?: ServiceLog[];
}

export interface ServiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  shipId?: string;
  serviceTypeId?: number;
  status?: string;
  priority?: string;
  assignedUserId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceListResponse {
  data: Service[];
  total: number;
  page: number;
  pageSize: number;
}

export const servicesApi = {
  list: (params: ServiceListParams) =>
    api.get<ServiceListResponse & { success: boolean }>('/services', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Service }>(`/services/${id}`),

  create: (data: Partial<Service>) =>
    api.post<{ success: boolean; data: Service }>('/services', data),

  update: (id: string, data: Partial<Service>) =>
    api.put<{ success: boolean; data: Service }>(`/services/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/services/${id}`),

  types: () =>
    api.get<{ success: boolean; data: ServiceType[] }>('/services/types'),

  convertToInvoice: (id: string) =>
    api.post<{ success: boolean; data: { id: string } }>(`/services/${id}/convert-to-invoice`),
};
