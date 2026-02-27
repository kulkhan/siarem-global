import api from '@/lib/api';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISED' | 'CANCELLED';

export interface Quote {
  id: string;
  quoteNumber: string;
  revision: number;
  parentQuoteId?: string;
  customerId: string;
  serviceId?: string;
  createdById?: string;
  shipCount: number;
  unitPrice?: number;
  currency: string;
  totalAmount?: number;
  priceEur?: number;
  priceUsd?: number;
  priceTry?: number;
  quoteDate: string;
  validUntil?: string;
  status: QuoteStatus;
  combinedInvoice: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; shortCode: string };
  service?: {
    id: string;
    ship?: { id: string; name: string; imoNumber?: string };
    serviceType?: { id: number; nameEn: string; nameTr: string; code: string };
  };
  createdBy?: { id: string; name: string };
  quoteShips?: { ship: { id: string; name: string; imoNumber?: string } }[];
  invoices?: { id: string; refNo?: string; amount: number; currency: string; status: string }[];
  _count?: { invoices: number };
}

export interface QuoteListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  serviceId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QuoteListResponse {
  data: Quote[];
  total: number;
  page: number;
  pageSize: number;
}

export const quotesApi = {
  list: (params: QuoteListParams) =>
    api.get<QuoteListResponse & { success: boolean }>('/quotes', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Quote }>(`/quotes/${id}`),

  create: (data: Partial<Quote>) =>
    api.post<{ success: boolean; data: Quote }>('/quotes', data),

  update: (id: string, data: Partial<Quote>) =>
    api.put<{ success: boolean; data: Quote }>(`/quotes/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/quotes/${id}`),

  convertToInvoice: (id: string) =>
    api.post<{ success: boolean; data: { id: string } }>(`/quotes/${id}/convert-to-invoice`),
};
