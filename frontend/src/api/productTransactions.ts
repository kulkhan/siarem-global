import api from '@/lib/api';
import type { ProductTransaction, ProductTransactionType } from '@/types';

export const productTransactionsApi = {
  list: (productId: string) =>
    api.get<{ success: boolean; data: ProductTransaction[] }>(`/products/${productId}/transactions`),

  create: (productId: string, data: { type: ProductTransactionType; quantity: number; notes?: string }) =>
    api.post<{ success: boolean; data: ProductTransaction }>(`/products/${productId}/transactions`, data),
};
