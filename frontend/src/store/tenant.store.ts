import { create } from 'zustand';

interface TenantStore {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
}

export const useTenantStore = create<TenantStore>((set) => ({
  selectedCompanyId: null,
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
}));
