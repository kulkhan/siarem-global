import api from '@/lib/api';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: string | null;
  userName: string | null;
  ipAddress: string | null;
  hostname: string | null;
  userAgent: string | null;
  changes: unknown;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditApi = {
  list: (params: {
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return api.get<AuditLogsResponse>(`/audit?${qs.toString()}`);
  },
};
