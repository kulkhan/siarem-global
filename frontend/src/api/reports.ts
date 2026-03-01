import api from '@/lib/api';

export interface RevenueMonthly { month: string; total: number }
export interface RevenueByStatus { status: string; _count: { id: number }; _sum: { amount: number | null } }
export interface RevenueReport {
  monthly: RevenueMonthly[];
  byStatus: RevenueByStatus[];
  overdue: Array<{ id: string; refNo: string | null; amount: number; currency: string; dueDate: string; status: string; customer: { id: string; name: string; shortCode: string } }>;
}

export interface StockProduct {
  id: string; code: string; name: string; unit: string;
  stock_quantity?: string | null; min_stock?: string | null;
  stockQuantity?: number | null; minStock?: number | null;
}
export interface StockReport {
  lowStock: StockProduct[];
  allProducts: StockProduct[];
}

export interface ServicesByStatus { status: string; _count: { id: number } }
export interface ServicesByPriority { priority: string; _count: { id: number } }
export interface ServiceMonthly { month: string; count: number }
export interface ServiceReport {
  byStatus: ServicesByStatus[];
  byPriority: ServicesByPriority[];
  monthly: ServiceMonthly[];
}

export interface CustomerReportRow {
  customer: { id: string; name: string; shortCode: string };
  invoiceCount: number;
  totalRevenue?: number;
}
export interface CustomerReport {
  topByRevenue: CustomerReportRow[];
  topByInvoiceCount: CustomerReportRow[];
}

export const reportsApi = {
  revenue: (months = 6) =>
    api.get<{ success: boolean; data: RevenueReport }>('/reports/revenue', { params: { months } }),

  stock: () =>
    api.get<{ success: boolean; data: StockReport }>('/reports/stock'),

  services: (months = 6) =>
    api.get<{ success: boolean; data: ServiceReport }>('/reports/services', { params: { months } }),

  customers: () =>
    api.get<{ success: boolean; data: CustomerReport }>('/reports/customers'),
};
