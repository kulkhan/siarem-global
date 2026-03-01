import api from '@/lib/api';

export interface DashboardStats {
  services: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    onHold: number;
  };
  quotes: {
    total: number;
    draft: number;
    sent: number;
    approved: number;
    rejected: number;
    revised: number;
    cancelled: number;
  };
  invoices: {
    thisMonthCount: number;
    thisMonthTotal: number;
    overdueCount: number;
  };
  invoicesByStatus: { status: string; count: number; total: number }[];
  topCustomers: { id: string; name: string; shortCode: string; invoiceCount: number; invoiceTotal: number }[];
  recentMeetings: {
    id: string;
    title: string;
    meetingType: string;
    meetingDate: string;
    customerName: string;
    customerShortCode: string;
  }[];
  servicesByPriority: { priority: string; count: number }[];
  quotesByMonth: { month: string; approved: number; rejected: number; total: number }[];
  revenueMonthly: { month: string; total: number }[];
  expiringCerts: {
    id: string;
    certType: string;
    certNo: string | null;
    expiryDate: string;
    daysLeft: number;
    ship: { id: string; name: string } | null;
  }[];
}

export const dashboardApi = {
  stats: () => api.get<{ success: boolean; data: DashboardStats }>('/dashboard'),
};
