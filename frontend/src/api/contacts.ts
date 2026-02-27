import api from '@/lib/api';

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const contactsApi = {
  list: (customerId: string) =>
    api.get<{ success: boolean; data: Contact[] }>(`/customers/${customerId}/contacts`),

  create: (customerId: string, data: Partial<Contact>) =>
    api.post<{ success: boolean; data: Contact }>(`/customers/${customerId}/contacts`, data),

  update: (customerId: string, id: string, data: Partial<Contact>) =>
    api.put<{ success: boolean; data: Contact }>(`/customers/${customerId}/contacts/${id}`, data),

  delete: (customerId: string, id: string) =>
    api.delete<{ success: boolean }>(`/customers/${customerId}/contacts/${id}`),
};
