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
  // extended
  callSign?: string;
  homePort?: string;
  iceClass?: string;
  eexi?: number;
  owner?: string;
  technicalManager?: string;
  customerRelationType?: string;
  customerSince?: string;
  // compliance
  euMrvMpStatus?: string;
  ukMrvMpStatus?: string;
  fuelEuMpStatus?: string;
  imoDcsStatus?: string;
  euEtsStatus?: string;
  seempPart2?: string;
  seempPart3?: string;
  createdAt: string;
  customer?: { id: string; name: string; shortCode: string };
  shipType?: ShipType;
  shipLogs?: ShipLog[];
  billingEntities?: ShipBillingEntity[];
}

export interface ShipLog {
  id: string;
  shipId: string;
  userId?: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface ShipBillingEntity {
  id: string;
  shipId: string;
  companyId: string;
  entityName: string;
  entityAddress?: string;
  entityTaxNo?: string;
  entityCountry?: string;
  entityEmail?: string;
  isDefault: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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

  listCertificates: (shipId: string) =>
    api.get<{ success: boolean; data: ShipCertificate[] }>(`/ships/${shipId}/certificates`),

  createCertificate: (shipId: string, data: ShipCertificateInput) =>
    api.post<{ success: boolean; data: ShipCertificate }>(`/ships/${shipId}/certificates`, data),

  updateCertificate: (shipId: string, certId: string, data: ShipCertificateInput) =>
    api.put<{ success: boolean; data: ShipCertificate }>(`/ships/${shipId}/certificates/${certId}`, data),

  deleteCertificate: (shipId: string, certId: string) =>
    api.delete(`/ships/${shipId}/certificates/${certId}`),

  listCertDocuments: (shipId: string, certId: string) =>
    api.get<{ success: boolean; data: CertDocument[] }>(`/ships/${shipId}/certificates/${certId}/documents`),

  uploadCertDocument: (shipId: string, certId: string, file: File, displayName: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('displayName', displayName);
    return api.post<{ success: boolean; data: CertDocument }>(
      `/ships/${shipId}/certificates/${certId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  deleteCertDocument: (shipId: string, certId: string, docId: string) =>
    api.delete(`/ships/${shipId}/certificates/${certId}/documents/${docId}`),

  listBillingEntities: (shipId: string) =>
    api.get<{ success: boolean; data: ShipBillingEntity[] }>(`/ships/${shipId}/billing-entities`),

  createBillingEntity: (shipId: string, data: Partial<ShipBillingEntity>) =>
    api.post<{ success: boolean; data: ShipBillingEntity }>(`/ships/${shipId}/billing-entities`, data),

  updateBillingEntity: (shipId: string, entityId: string, data: Partial<ShipBillingEntity>) =>
    api.put<{ success: boolean; data: ShipBillingEntity }>(`/ships/${shipId}/billing-entities/${entityId}`, data),

  deleteBillingEntity: (shipId: string, entityId: string) =>
    api.delete(`/ships/${shipId}/billing-entities/${entityId}`),
};

export interface ShipCertificate {
  id: string;
  shipId: string;
  companyId: string;
  certType: string;
  certNo: string | null;
  issueDate: string | null;
  expiryDate: string;
  issuedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ShipCertificateInput {
  certType: string;
  certNo?: string;
  issueDate?: string;
  expiryDate: string;
  issuedBy?: string;
  notes?: string;
}

export interface CertDocument {
  id: string;
  displayName: string;
  originalFilename: string;
  storedFilename: string;
  mimetype: string | null;
  size: number | null;
  createdAt: string;
}
