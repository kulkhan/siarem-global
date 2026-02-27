import api from '@/lib/api';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  refNo?: string;
  customerId: string;
  serviceId?: string;
  quoteId?: string;
  createdById?: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  isCombined: boolean;
  invoiceDate: string;
  dueDate?: string;
  sentAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; shortCode: string };
  service?: {
    id: string;
    ship?: { id: string; name: string; imoNumber?: string };
    serviceType?: { id: number; nameEn: string; nameTr: string; code: string };
  };
  quote?: { id: string; quoteNumber: string };
  createdBy?: { id: string; name: string };
  payments?: Payment[];
  _count?: { payments: number };
}

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  serviceId?: string;
  status?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceListResponse {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export const invoicesApi = {
  list: (params: InvoiceListParams) =>
    api.get<InvoiceListResponse & { success: boolean }>('/invoices', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Invoice }>(`/invoices/${id}`),

  create: (data: Partial<Invoice>) =>
    api.post<{ success: boolean; data: Invoice }>('/invoices', data),

  update: (id: string, data: Partial<Invoice>) =>
    api.put<{ success: boolean; data: Invoice }>(`/invoices/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/invoices/${id}`),

  addPayment: (invoiceId: string, data: Omit<Payment, 'id' | 'invoiceId' | 'createdAt'>) =>
    api.post<{ success: boolean; data: Payment }>(`/invoices/${invoiceId}/payments`, data),

  deletePayment: (invoiceId: string, paymentId: string) =>
    api.delete<{ success: boolean }>(`/invoices/${invoiceId}/payments/${paymentId}`),
};
