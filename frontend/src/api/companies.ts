import api from '@/lib/api';
import type { Company } from '@/types';

export interface CompanyInput {
  name: string;
  domain: string;
  slug: string;
  plan?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export async function getCompanies(): Promise<Company[]> {
  const res = await api.get('/companies');
  return res.data.data;
}

export async function getCompany(id: string): Promise<Company> {
  const res = await api.get(`/companies/${id}`);
  return res.data.data;
}

export async function createCompany(data: CompanyInput): Promise<Company> {
  const res = await api.post('/companies', data);
  return res.data.data;
}

export async function updateCompany(id: string, data: Partial<CompanyInput>): Promise<Company> {
  const res = await api.put(`/companies/${id}`, data);
  return res.data.data;
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/companies/${id}`);
}
