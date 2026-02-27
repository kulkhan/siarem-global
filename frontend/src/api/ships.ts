import api from '@/lib/api';

export interface ShipType {
  id: number;
  name: string;
  ciiType: string;
}

export interface Ship {
  id: string;
  customerId: string;
  name: string;
  imoNumber?: string;
  shipTypeId?: number;
  flag?: string;
  grossTonnage?: number;
  dwt?: number;
  netTonnage?: number;
  builtYear?: number;
  classificationSociety?: string;
  emissionVerifier?: string;
  itSystem?: string;
  adminAuthority?: string;
  isLargeVessel: boolean;
  status: 'ACTIVE' | 'PASSIVE' | 'SOLD' | 'SCRAPPED';
  notes?: string;
  createdAt: string;
  customer?: { id: string; name: string; shortCode: string };
  shipType?: ShipType;
}

export interface ShipListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  shipTypeId?: number;
  status?: string;
  flag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShipListResponse {
  data: Ship[];
  total: number;
  page: number;
  pageSize: number;
}

export const shipsApi = {
  list: (params: ShipListParams) =>
    api.get<ShipListResponse & { success: boolean }>('/ships', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Ship }>(`/ships/${id}`),

  create: (data: Partial<Ship>) =>
    api.post<{ success: boolean; data: Ship }>('/ships', data),

  update: (id: string, data: Partial<Ship>) =>
    api.put<{ success: boolean; data: Ship }>(`/ships/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/ships/${id}`),

  types: () =>
    api.get<{ success: boolean; data: ShipType[] }>('/ships/types'),

  flagOptions: () =>
    api.get<{ success: boolean; data: string[] }>('/ships/options/flags'),
};
