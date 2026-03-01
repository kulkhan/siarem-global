import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, FileText, MessageSquare, Wrench,
  CheckCircle, ChevronRight, X, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotificationSummary } from '@/api/notifications';
import type { OverdueInvoice, ExpiredQuote, OpenComplaint, BillingReadyService, LowStockProduct } from '@/api/notifications';

interface Props {
  onClose: () => void;
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotificationPanel({ onClose }: Props) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: getNotificationSummary,
    staleTime: 2 * 60 * 1000,
  });

  function go(path: string) {
    navigate(path);
    onClose();
  }

  const total = data?.total ?? 0;

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
          {total > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 rounded-full text-[10px] text-white font-bold">
              {total > 99 ? '99+' : total}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[460px] overflow-y-auto">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Yükleniyor...</div>
        ) : total === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Her şey yolunda!</p>
            <p className="text-xs text-gray-400 mt-1">Bekleyen işlem bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">

            {/* ── Geciken Faturalar ───────────────────── */}
            {data!.overdueInvoices.count > 0 && (
              <Section
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                label="Geciken Fatura"
                count={data!.overdueInvoices.count}
                colorClass="text-red-600 bg-red-50 border-red-200"
                onViewAll={() => go('/invoices')}
              >
                {data!.overdueInvoices.items.map((inv: OverdueInvoice) => {
                  const days = daysAgo(inv.dueDate);
                  return (
                    <button
                      key={inv.id}
                      onClick={() => go('/invoices')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/50 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{inv.customer.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {inv.refNo ?? '—'} · {inv.amount.toLocaleString('tr-TR')} {inv.currency}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {days}g geçti
                      </span>
                    </button>
                  );
                })}
              </Section>
            )}

            {/* ── Yanıt Bekleyen Teklifler ────────────── */}
            {data!.expiredQuotes.count > 0 && (
              <Section
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Yanıt Bekleyen Teklif"
                count={data!.expiredQuotes.count}
                colorClass="text-amber-600 bg-amber-50 border-amber-200"
                onViewAll={() => go('/quotes')}
              >
                {data!.expiredQuotes.items.map((q: ExpiredQuote) => {
                  const isExpired = q.validUntil && new Date(q.validUntil) < new Date();
                  return (
                    <button
                      key={q.id}
                      onClick={() => go('/quotes')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/50 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{q.customer.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {q.quoteNumber}
                          {q.validUntil && ` · Son: ${formatDate(q.validUntil)}`}
                        </p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap',
                        isExpired
                          ? 'text-red-600 bg-red-100 border-red-200'
                          : 'text-amber-600 bg-amber-100 border-amber-200'
                      )}>
                        {isExpired ? 'Süresi doldu' : 'Beklemede'}
                      </span>
                    </button>
                  );
                })}
              </Section>
            )}

            {/* ── Açık Şikayetler ────────────────────── */}
            {data!.openComplaints.count > 0 && (
              <Section
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                label="Açık Şikayet"
                count={data!.openComplaints.count}
                colorClass="text-orange-600 bg-orange-50 border-orange-200"
                onViewAll={() => go('/complaints')}
              >
                {data!.openComplaints.items.map((c: OpenComplaint) => (
                  <button
                    key={c.id}
                    onClick={() => go('/complaints')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.subject}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {c.customer?.name ?? 'Harici'}
                        {' · '}
                        {c.type === 'COMPLAINT' ? 'Şikayet' : c.type === 'FEEDBACK' ? 'Geri Bildirim' : 'Öneri'}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0',
                      c.status === 'OPEN'
                        ? 'text-orange-600 bg-orange-100 border-orange-200'
                        : 'text-blue-600 bg-blue-100 border-blue-200'
                    )}>
                      {c.status === 'OPEN' ? 'Açık' : 'İşlemde'}
                    </span>
                  </button>
                ))}
              </Section>
            )}

            {/* ── Fatura Hazır Servisler ──────────────── */}
            {data!.billingReadyServices.count > 0 && (
              <Section
                icon={<Wrench className="w-3.5 h-3.5" />}
                label="Fatura Hazır Servis"
                count={data!.billingReadyServices.count}
                colorClass="text-blue-600 bg-blue-50 border-blue-200"
                onViewAll={() => go('/services')}
              >
                {data!.billingReadyServices.items.map((s: BillingReadyService) => (
                  <button
                    key={s.id}
                    onClick={() => go('/services')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{s.customer.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {s.serviceType?.nameTr ?? 'Servis'} · {formatDate(s.updatedAt)}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Faturalanacak
                    </span>
                  </button>
                ))}
              </Section>
            )}

            {/* ── Kritik Stok Ürünler ─────────────────── */}
            {(data!.lowStockProducts?.count ?? 0) > 0 && (
              <Section
                icon={<Package className="w-3.5 h-3.5" />}
                label="Kritik Stok"
                count={data!.lowStockProducts.count}
                colorClass="text-yellow-700 bg-yellow-50 border-yellow-300"
                onViewAll={() => go('/products')}
              >
                {data!.lowStockProducts.items.map((p: LowStockProduct) => {
                  const qty = p.stockQuantity != null ? Number(p.stockQuantity) : null;
                  const isEmpty = qty != null && qty <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => go('/products')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-50/50 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {p.code} · Stok: {qty ?? '—'}
                          {p.minStock != null && ` / Min: ${p.minStock}`}
                        </p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap',
                        isEmpty
                          ? 'text-red-600 bg-red-100 border-red-200'
                          : 'text-yellow-700 bg-yellow-100 border-yellow-300'
                      )}>
                        {isEmpty ? 'Tükendi' : 'Kritik'}
                      </span>
                    </button>
                  );
                })}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section bileşeni ───────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  colorClass: string;
  onViewAll: () => void;
  children: React.ReactNode;
}

function Section({ icon, label, count, colorClass, onViewAll, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className={cn('flex items-center justify-center w-5 h-5 rounded-md border', colorClass)}>
            {icon}
          </span>
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border', colorClass)}>
            {count}
          </span>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors"
        >
          Tümü <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      {children}
    </div>
  );
}
