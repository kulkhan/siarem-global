import api from '@/lib/api';

export type ExpenseType = 'INCOME' | 'EXPENSE';

export const EXPENSE_CATEGORIES = [
  'Personnel', 'Office', 'Travel', 'Service Cost',
  'Equipment', 'Software', 'Marketing', 'Tax', 'Other',
];

export const EXPENSE_CATEGORY_TR: Record<string, string> = {
  Personnel: 'Personel',
  Office: 'Ofis',
  Travel: 'Seyahat',
  'Service Cost': 'Hizmet Maliyeti',
  Equipment: 'Ekipman',
  Software: 'Yazılım',
  Marketing: 'Pazarlama',
  Tax: 'Vergi',
  Other: 'Diğer',
};

export interface Expense {
  id: string;
  type: ExpenseType;
  category?: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  customerId?: string;
  shipId?: string;
  serviceId?: string;
  invoiceId?: string;
  notes?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; shortCode: string };
  ship?: { id: string; name: string };
  service?: { id: string; serviceType?: { nameTr: string; nameEn: string } };
  createdBy?: { id: string; name: string };
}

export interface ExpenseListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  category?: string;
  currency?: string;
  customerId?: string;
  shipId?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseListResponse {
  data: Expense[];
  total: number;
  page: number;
  pageSize: number;
  incomeTotal: number;
  expenseTotal: number;
  net: number;
}

export const expensesApi = {
  list: (params: ExpenseListParams) =>
    api.get<ExpenseListResponse & { success: boolean }>('/expenses', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Expense }>(`/expenses/${id}`),

  create: (data: Partial<Expense>) =>
    api.post<{ success: boolean; data: Expense }>('/expenses', data),

  update: (id: string, data: Partial<Expense>) =>
    api.put<{ success: boolean; data: Expense }>(`/expenses/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/expenses/${id}`),
};
