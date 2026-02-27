export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';

export type { Complaint, ComplaintType, ComplaintStatus } from '@/api/complaints';

export interface Company {
  id: string;
  name: string;
  domain: string;
  slug: string;
  isActive: boolean;
  plan: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export type ShipStatus = 'ACTIVE' | 'PASSIVE' | 'SOLD' | 'SCRAPPED';
export type ServiceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface ServiceType {
  id: number;
  companyId: string | null;
  nameEn: string;
  nameTr: string;
  code: string;
  category: string | null;
  description: string | null;
}

export interface Product {
  id: string;
  companyId: string;
  code: string;
  name: string;
  nameEn: string | null;
  unit: string;
  unitPriceEur: number | null;
  unitPriceUsd: number | null;
  unitPriceTry: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id?: string;
  quoteId?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  total: number;
  sortOrder?: number;
  product?: Product | null;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  total: number;
  sortOrder?: number;
  product?: Product | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
