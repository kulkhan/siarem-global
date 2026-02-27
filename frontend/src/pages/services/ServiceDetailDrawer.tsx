import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Ship, User, CheckCircle2, Circle, FileText, Send, CreditCard, ClipboardCheck } from 'lucide-react';
import { servicesApi, type ServiceInvoice, type ServiceLog } from '@/api/services';

// ── Billing pipeline ─────────────────────────────────────────────────────────

interface BillingStage {
  key: string;
  label: string;
  icon: React.ElementType;
  done: boolean;
  sub?: string;
}

const INVOICE_STATUS_DONE = new Set(['SENT', 'PARTIALLY_PAID', 'PAID']);
const INVOICE_PAID = new Set(['PAID', 'PARTIALLY_PAID']);

function BillingPipeline({
  invoiceReady,
  invoiceReadyNote,
  invoices,
}: {
  invoiceReady: boolean;
  invoiceReadyNote?: string;
  invoices: ServiceInvoice[];
}) {
  const { t } = useTranslation();
  const inv = invoices[0];

  const stages: BillingStage[] = [
    {
      key: 'ready',
      label: t('services.billing.ready'),
      icon: ClipboardCheck,
      done: invoiceReady,
      sub: invoiceReadyNote,
    },
    {
      key: 'draft',
      label: t('services.billing.draft'),
      icon: FileText,
      done: !!inv,
      sub: inv?.refNo,
    },
    {
      key: 'sent',
      label: t('services.billing.sent'),
      icon: Send,
      done: !!inv && INVOICE_STATUS_DONE.has(inv.status),
      sub: inv?.sentAt ? new Date(inv.sentAt).toLocaleDateString('tr-TR') : undefined,
    },
    {
      key: 'paid',
      label: t('services.billing.paid'),
      icon: CreditCard,
      done: !!inv && INVOICE_PAID.has(inv.status),
      sub: inv?.status === 'PARTIALLY_PAID' ? 'Kısmi' : undefined,
    },
  ];

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t('services.billing.title')}
      </h3>
      <div className="flex items-start gap-0">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Icon + connector */}
                <div className="flex items-center w-full">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                      stage.done
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {stage.done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {idx < stages.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        stages[idx + 1].done ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="mt-1.5 px-1 text-center w-full">
                  <div
                    className={`text-[11px] font-medium leading-tight ${
                      stage.done ? 'text-green-700' : 'text-gray-400'
                    }`}
                  >
                    {stage.label}
                  </div>
                  {stage.sub && (
                    <div className="text-[10px] text-gray-500 mt-0.5 font-mono truncate">
                      {stage.sub}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── History log ───────────────────────────────────────────────────────────────

const ACTION_COLOR: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  STATUS_CHANGED: 'bg-purple-100 text-purple-700',
  BILLING_READY: 'bg-green-100 text-green-700',
  ASSIGNED: 'bg-orange-100 text-orange-700',
  UPDATED: 'bg-gray-100 text-gray-600',
};

function HistoryEntry({ log }: { log: ServiceLog }) {
  const { t } = useTranslation();
  const label = t(`services.history.${log.action}`, log.action);
  const color = ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600';
  const date = new Date(log.createdAt);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 shrink-0">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${color}`}>
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {log.field && (
          <div className="text-xs text-gray-600">
            <span className="font-mono text-gray-400">{log.field}: </span>
            {log.oldValue && (
              <>
                <span className="line-through text-red-400">{log.oldValue}</span>
                <span className="mx-1 text-gray-300">→</span>
              </>
            )}
            <span className="text-gray-700 font-medium">{log.newValue}</span>
          </div>
        )}
        {log.note && <div className="text-xs text-gray-500 mt-0.5">{log.note}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] text-gray-400">{date.toLocaleDateString('tr-TR')}</div>
        <div className="text-[10px] text-gray-400">{date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
        {log.user && <div className="text-[10px] text-gray-500 font-medium mt-0.5">{log.user.name}</div>}
      </div>
    </div>
  );
}

// ── Compliance fields ─────────────────────────────────────────────────────────

function ComplianceRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <span className="text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface Props {
  serviceId: string;
  onClose: () => void;
  onEdit: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  ON_HOLD: 'bg-orange-100 text-orange-800',
};

export default function ServiceDetailDrawer({ serviceId, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { data: res, isLoading } = useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: () => servicesApi.getOne(serviceId).then((r) => r.data.data),
    enabled: !!serviceId,
  });

  const svc = res;

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[480px] max-w-full h-full bg-white shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{t('services.detail')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-gray-700"
            >
              {t('common.edit')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading || !svc ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Service type + status */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm leading-snug">
                    {svc.serviceType ? (lang === 'tr' ? svc.serviceType.nameTr : svc.serviceType.nameEn) : '—'}
                  </div>
                  {svc.serviceType && (
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{svc.serviceType.code}</div>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[svc.status] ?? ''}`}>
                  {t(`status.${svc.status.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`, svc.status)}
                </span>
              </div>
            </div>

            {/* Customer + Ship + User */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0 text-xs">{t('services.fields.customer')}</span>
                <span className="font-medium text-gray-800">{svc.customer?.name ?? '—'}</span>
                <span className="text-gray-400 text-xs">({svc.customer?.shortCode})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0 text-xs">{t('services.fields.ship')}</span>
                {svc.ship ? (
                  <span className="flex items-center gap-1 font-medium text-gray-800">
                    <Ship className="w-3.5 h-3.5 text-gray-400" />
                    {svc.ship.name}
                    {svc.ship.imoNumber && <span className="text-gray-400 text-xs font-mono">({svc.ship.imoNumber})</span>}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              {svc.assignedUser && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0 text-xs">{t('services.fields.assignedUser')}</span>
                  <span className="flex items-center gap-1 font-medium text-gray-800">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {svc.assignedUser.name}
                  </span>
                </div>
              )}
            </div>

            {/* Billing pipeline */}
            <div className="px-5 py-4 border-b border-gray-100">
              <BillingPipeline
                invoiceReady={svc.invoiceReady}
                invoiceReadyNote={svc.invoiceReadyNote}
                invoices={svc.invoices ?? []}
              />
            </div>

            {/* Status note + MOHA */}
            {(svc.statusNote || svc.mohaStatus) && (
              <div className="px-5 py-3 border-b border-gray-100 space-y-1.5">
                {svc.statusNote && (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('services.fields.statusNote')}</div>
                    <div className="text-sm text-gray-700">{svc.statusNote}</div>
                  </div>
                )}
                {svc.mohaStatus && (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('services.fields.mohaStatus')}</div>
                    <div className="text-sm text-gray-700">{svc.mohaStatus}</div>
                  </div>
                )}
              </div>
            )}

            {/* Compliance statuses */}
            {(svc.euMrvMpStatus || svc.ukMrvMpStatus || svc.fuelEuMpStatus || svc.imoDcsStatus || svc.euEtsStatus) && (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('services.sections.compliance')}</div>
                <ComplianceRow label="EU MRV MP" value={svc.euMrvMpStatus} />
                <ComplianceRow label="UK MRV MP" value={svc.ukMrvMpStatus} />
                <ComplianceRow label="Fuel EU MP" value={svc.fuelEuMpStatus} />
                <ComplianceRow label="IMO DCS" value={svc.imoDcsStatus} />
                <ComplianceRow label="EU ETS" value={svc.euEtsStatus} />
              </div>
            )}

            {/* Notes */}
            {svc.notes && (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('services.fields.notes')}</div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{svc.notes}</div>
              </div>
            )}

            {/* History log */}
            <div className="px-5 py-4">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t('services.history.title')}
              </div>
              {!svc.logs || svc.logs.length === 0 ? (
                <div className="text-xs text-gray-400">{t('services.history.noHistory')}</div>
              ) : (
                <div>
                  {svc.logs.map((log) => (
                    <HistoryEntry key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
