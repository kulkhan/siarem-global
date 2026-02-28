import api from '@/lib/api';

export interface BankAccount {
  id: string;
  customerId: string;
  bankName: string;
  iban?: string;
  accountNo?: string;
  currency?: string;
  notes?: string;
  sortOrder: number;
}

export interface Customer {
  id: string;
  shortCode: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { ships: number };
  bankAccounts?: BankAccount[];
}

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  country?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export const customersApi = {
  list: (params: CustomerListParams) =>
    api.get<CustomerListResponse & { success: boolean }>('/customers', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Customer }>(`/customers/${id}`),

  create: (data: Partial<Customer>) =>
    api.post<{ success: boolean; data: Customer }>('/customers', data),

  update: (id: string, data: Partial<Customer>) =>
    api.put<{ success: boolean; data: Customer }>(`/customers/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/customers/${id}`),

  countryOptions: () =>
    api.get<{ success: boolean; data: string[] }>('/customers/options/countries'),

  getAssignees: (customerId: string) =>
    api.get<{ success: boolean; data: Assignee[] }>(`/customers/${customerId}/assignees`),

  addAssignee: (customerId: string, userId: string) =>
    api.post<{ success: boolean; data: Assignee }>(`/customers/${customerId}/assignees`, { userId }),

  removeAssignee: (customerId: string, userId: string) =>
    api.delete(`/customers/${customerId}/assignees/${userId}`),

  listBankAccounts: (customerId: string) =>
    api.get<{ success: boolean; data: BankAccount[] }>(`/customers/${customerId}/bank-accounts`),

  createBankAccount: (customerId: string, data: Partial<BankAccount>) =>
    api.post<{ success: boolean; data: BankAccount }>(`/customers/${customerId}/bank-accounts`, data),

  updateBankAccount: (customerId: string, bankId: string, data: Partial<BankAccount>) =>
    api.put<{ success: boolean; data: BankAccount }>(`/customers/${customerId}/bank-accounts/${bankId}`, data),

  deleteBankAccount: (customerId: string, bankId: string) =>
    api.delete(`/customers/${customerId}/bank-accounts/${bankId}`),
};

export interface Assignee {
  customerId: string;
  userId: string;
  assignedAt: string;
  user: { id: string; name: string; email: string; role: string };
}
