import api from '@/lib/api';

export interface EmailRule {
  id: string;
  emailConfigId: string;
  name: string;
  description: string;
  assignedUserIds: string[];
  priority: string;
  isActive: boolean;
  sortOrder: number;
  assignedUsers?: { id: string; name: string }[];
}

export interface EmailConfig {
  id: string;
  companyId: string;
  host: string;
  port: number;
  username: string;
  useTls: boolean;
  pollIntervalMinutes: number;
  isActive: boolean;
  lastPolledAt?: string | null;
  rules: EmailRule[];
}

export interface EmailLog {
  id: string;
  messageUid: string;
  subject?: string | null;
  fromAddress?: string | null;
  matchedRuleId?: string | null;
  taskId?: string | null;
  aiReason?: string | null;
  status: string;
  createdAt: string;
  matchedRule?: { id: string; name: string } | null;
}

export interface EmailConfigInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  useTls: boolean;
  pollIntervalMinutes: number;
  isActive: boolean;
}

export interface EmailRuleInput {
  emailConfigId: string;
  name: string;
  description: string;
  assignedUserIds: string[];
  priority: string;
  sortOrder?: number;
}

export const emailConfigApi = {
  get: () =>
    api.get<{ success: boolean; data: EmailConfig | null }>('/email-router/config'),

  save: (data: EmailConfigInput) =>
    api.put<{ success: boolean; data: EmailConfig }>('/email-router/config', data),

  test: (data: { host: string; port: number; username: string; password: string; useTls: boolean }) =>
    api.post<{ success: boolean; message: string }>('/email-router/config/test', data),

  createRule: (data: EmailRuleInput) =>
    api.post<{ success: boolean; data: EmailRule }>('/email-router/config/rules', data),

  updateRule: (ruleId: string, data: Partial<EmailRuleInput & { isActive: boolean }>) =>
    api.put<{ success: boolean; data: EmailRule }>(`/email-router/config/rules/${ruleId}`, data),

  deleteRule: (ruleId: string) =>
    api.delete(`/email-router/config/rules/${ruleId}`),

  rescan: () =>
    api.post<{ success: boolean; data: { resetCount: number } }>('/email-router/config/rescan', {}),

  getLogs: () =>
    api.get<{ success: boolean; data: EmailLog[] }>('/email-router/logs'),
};
