import api from '@/lib/api';

export interface OverdueInvoice {
  id: string;
  refNo: string | null;
  amount: number;
  currency: string;
  dueDate: string;
  status: string;
  customer: { name: string };
}

export interface ExpiredQuote {
  id: string;
  quoteNumber: string;
  totalAmount: number | null;
  currency: string;
  validUntil: string | null;
  updatedAt: string;
  customer: { name: string };
}

export interface OpenComplaint {
  id: string;
  subject: string;
  status: string;
  type: string;
  createdAt: string;
  customer: { name: string } | null;
}

export interface BillingReadyService {
  id: string;
  status: string;
  updatedAt: string;
  customer: { name: string };
  serviceType: { nameTr: string } | null;
}

export interface LowStockProduct {
  id: string;
  code: string;
  name: string;
  stockQuantity: string | null;
  minStock: string | null;
}

export interface NotificationSummary {
  overdueInvoices: { count: number; items: OverdueInvoice[] };
  expiredQuotes: { count: number; items: ExpiredQuote[] };
  openComplaints: { count: number; items: OpenComplaint[] };
  billingReadyServices: { count: number; items: BillingReadyService[] };
  lowStockProducts: { count: number; items: LowStockProduct[] };
  total: number;
}

export async function getNotificationSummary(): Promise<NotificationSummary> {
  const res = await api.get<{ success: boolean; data: NotificationSummary }>('/notifications/summary');
  return res.data.data;
}
