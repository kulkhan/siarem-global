import api from '@/lib/api';

export type ImportEntity = 'customers' | 'products' | 'quotes' | 'invoices' | 'services';

export interface PreviewRow {
  rowNum: number;
  data: Record<string, unknown>;
}

export interface PreviewErrorRow extends PreviewRow {
  reason: string;
}

export interface PreviewResult {
  valid: PreviewRow[];
  skipped: PreviewErrorRow[];
  errors: PreviewErrorRow[];
  summary: {
    total: number;
    valid: number;
    skipped: number;
    errors: number;
  };
}

export interface ExecuteResult {
  imported: number;
  errors: Array<{ rowNum: number; reason: string }>;
}

export const importApi = {
  downloadTemplate: (entity: ImportEntity) =>
    api.get(`/import/${entity}/template`, { responseType: 'blob' }),

  preview: (entity: ImportEntity, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: boolean; data: PreviewResult }>(`/import/${entity}/preview`, form);
  },

  execute: (entity: ImportEntity, rows: PreviewRow[]) =>
    api.post<{ success: boolean; data: ExecuteResult }>(`/import/${entity}/execute`, { rows }),
};
