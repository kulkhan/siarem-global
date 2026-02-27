import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auditApi, type AuditLog } from '@/api/audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ENTITY_TYPES = ['Customer', 'Ship', 'Service', 'Quote', 'Invoice', 'Meeting', 'Expense', 'Contact'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function AuditLogTab() {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', entityType, action, from, to, page],
    queryFn: () => auditApi.list({ entityType, action, from, to, page, limit: 20 }).then((r) => r.data),
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function resetFilters() {
    setEntityType('');
    setAction('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">{t('settings.audit.entityType')}</p>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t('common.all')}</option>
            {ENTITY_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500">{t('settings.audit.action')}</p>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t('common.all')}</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500">{t('settings.audit.from')}</p>
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="h-9 w-36"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500">{t('settings.audit.to')}</p>
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="h-9 w-36"
          />
        </div>

        {(entityType || action || from || to) && (
          <Button variant="outline" size="sm" onClick={resetFilters} className="h-9">
            {t('common.reset')}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium w-36">{t('settings.audit.date')}</th>
                  <th className="text-left px-4 py-3 font-medium w-28">{t('settings.audit.user')}</th>
                  <th className="text-left px-4 py-3 font-medium w-20">{t('settings.audit.action')}</th>
                  <th className="text-left px-4 py-3 font-medium w-24">{t('settings.audit.entityType')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('settings.audit.entityId')}</th>
                  <th className="text-left px-4 py-3 font-medium w-28">{t('settings.audit.ip')}</th>
                  <th className="text-left px-4 py-3 font-medium w-28">{t('settings.audit.hostname')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{log.userName ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{log.entityType}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs truncate max-w-[120px]" title={log.entityId ?? ''}>
                      {log.entityId ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs truncate max-w-[120px]" title={log.hostname ?? ''}>
                      {log.hostname ?? '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {t('common.page')} {page} / {totalPages} — {t('common.total')}: {data?.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
