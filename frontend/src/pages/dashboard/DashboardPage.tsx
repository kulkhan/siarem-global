import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench, FileText, Receipt, AlertTriangle,
  TrendingUp, CheckCircle, XCircle, Phone, Users, ShieldAlert,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import { dashboardApi } from '@/api/dashboard';

// ── Colour palettes ────────────────────────────────────────────────────────────

const SERVICE_STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  ON_HOLD: '#8b5cf6',
  COMPLETED: '#22c55e',
  CANCELLED: '#d1d5db',
};

const QUOTE_COLORS: Record<string, string> = {
  APPROVED: '#22c55e',
  SENT: '#3b82f6',
  DRAFT: '#9ca3af',
  REVISED: '#f59e0b',
  REJECTED: '#ef4444',
  CANCELLED: '#d1d5db',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af',
  SENT: '#3b82f6',
  PARTIALLY_PAID: '#f59e0b',
  PAID: '#22c55e',
  OVERDUE: '#ef4444',
  CANCELLED: '#d1d5db',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#d1d5db',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, iconColor, bgColor,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{children}</h3>;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data.data),
    staleTime: 1000 * 60 * 2,
  });

  // ── Chart data ──────────────────────────────────────────────────────────────

  const serviceBarData = stats
    ? [
        { name: 'Açık', value: stats.services.open, fill: SERVICE_STATUS_COLORS.OPEN },
        { name: 'Devam', value: stats.services.inProgress, fill: SERVICE_STATUS_COLORS.IN_PROGRESS },
        { name: 'Bek.', value: stats.services.onHold, fill: SERVICE_STATUS_COLORS.ON_HOLD },
        { name: 'Bit.', value: stats.services.completed, fill: SERVICE_STATUS_COLORS.COMPLETED },
        { name: 'İptal', value: stats.services.cancelled, fill: SERVICE_STATUS_COLORS.CANCELLED },
      ].filter((d) => d.value > 0)
    : [];

  const quotePieData = stats
    ? [
        { name: t('status.approved'), value: stats.quotes.approved, color: QUOTE_COLORS.APPROVED },
        { name: t('status.sent'), value: stats.quotes.sent, color: QUOTE_COLORS.SENT },
        { name: t('status.draft'), value: stats.quotes.draft, color: QUOTE_COLORS.DRAFT },
        { name: t('status.revised'), value: stats.quotes.revised, color: QUOTE_COLORS.REVISED },
        { name: t('status.rejected'), value: stats.quotes.rejected, color: QUOTE_COLORS.REJECTED },
        { name: t('status.cancelled'), value: stats.quotes.cancelled, color: QUOTE_COLORS.CANCELLED },
      ].filter((d) => d.value > 0)
    : [];

  const invoicePieData = stats
    ? stats.invoicesByStatus
        .filter((r) => r.count > 0)
        .map((r) => ({
          name: t(`status.${r.status.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`, r.status),
          value: r.count,
          color: INVOICE_STATUS_COLORS[r.status] ?? '#9ca3af',
        }))
    : [];

  const priorityData = stats
    ? [
        { name: 'Acil', value: stats.servicesByPriority.find((p) => p.priority === 'URGENT')?.count ?? 0, fill: PRIORITY_COLORS.URGENT },
        { name: 'Yüksek', value: stats.servicesByPriority.find((p) => p.priority === 'HIGH')?.count ?? 0, fill: PRIORITY_COLORS.HIGH },
        { name: 'Orta', value: stats.servicesByPriority.find((p) => p.priority === 'MEDIUM')?.count ?? 0, fill: PRIORITY_COLORS.MEDIUM },
        { name: 'Düşük', value: stats.servicesByPriority.find((p) => p.priority === 'LOW')?.count ?? 0, fill: PRIORITY_COLORS.LOW },
      ].filter((d) => d.value > 0)
    : [];

  const quoteMonthData = stats?.quotesByMonth.map((r) => ({
    month: fmtMonth(r.month),
    Onaylanan: r.approved,
    Reddedilen: r.rejected,
  })) ?? [];

  const revenueMonthData = stats?.revenueMonthly.map((r) => ({
    month: fmtMonth(r.month),
    Gelir: r.total,
  })) ?? [];

  const expiringCerts = stats?.expiringCerts ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">{t('common.loading')}</div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('dashboard.welcomeBack')}, {user?.name}
        </h2>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Açık Hizmetler"
          value={stats?.services.open ?? 0}
          sub={`${stats?.services.inProgress ?? 0} devam ediyor`}
          icon={Wrench}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <KpiCard
          label="Bekleyen Teklifler"
          value={(stats?.quotes.draft ?? 0) + (stats?.quotes.sent ?? 0)}
          sub={`${stats?.quotes.approved ?? 0} onaylı · ${stats?.quotes.rejected ?? 0} ret`}
          icon={FileText}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
        />
        <KpiCard
          label="Bu Ay Fatura"
          value={stats?.invoices.thisMonthCount ?? 0}
          sub={`Toplam: ${fmt(stats?.invoices.thisMonthTotal ?? 0)}`}
          icon={Receipt}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
        <KpiCard
          label="Gecikmiş Fatura"
          value={stats?.invoices.overdueCount ?? 0}
          sub="Vadesi geçmiş"
          icon={AlertTriangle}
          iconColor="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      {/* Row 2: Quote pie + Service bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quote pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionTitle>Teklif Durumu Dağılımı</SectionTitle>
          {quotePieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Henüz teklif yok</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={quotePieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {quotePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => [v ?? 0, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {quotePieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-gray-800">{d.value}</span>
                  </div>
                ))}
                {stats && stats.quotes.total > 0 && (
                  <div className="pt-1 border-t border-gray-100 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-gray-500">
                      Onay oranı: <strong>{Math.round((stats.quotes.approved / stats.quotes.total) * 100)}%</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Service bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionTitle>Hizmet Durumu</SectionTitle>
          {serviceBarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Henüz hizmet yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={serviceBarData} barSize={36} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(v: number | undefined) => [v ?? 0, 'Hizmet']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {serviceBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Quotes by month + Invoice status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quotes by month */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionTitle>Son 6 Ay — Teklif Onay / Ret</SectionTitle>
          {quoteMonthData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={quoteMonthData} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Onaylanan" fill={QUOTE_COLORS.APPROVED} radius={[3, 3, 0, 0]} barSize={12} />
                <Bar dataKey="Reddedilen" fill={QUOTE_COLORS.REJECTED} radius={[3, 3, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Invoice pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionTitle>Fatura Durumu Dağılımı</SectionTitle>
          {invoicePieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Henüz fatura yok</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={invoicePieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {invoicePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => [v ?? 0, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {invoicePieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Top customers + Sidebar (priority + meetings) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top customers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <SectionTitle>En Çok Faturalanan Firmalar</SectionTitle>
          {(stats?.topCustomers ?? []).length === 0 ? (
            <div className="text-gray-400 text-sm py-4 text-center">Veri yok</div>
          ) : (
            <div className="space-y-3">
              {stats?.topCustomers.map((c, i) => {
                const maxTotal = stats.topCustomers[0]?.invoiceTotal || 1;
                const pct = Math.round((c.invoiceTotal / maxTotal) * 100);
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-5 text-xs font-bold text-gray-400 text-right shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">{c.shortCode}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gray-800">{fmt(c.invoiceTotal)}</div>
                      <div className="text-[10px] text-gray-400">{c.invoiceCount} fatura</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Active services by priority */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionTitle>Aktif Hizmet Öncelikleri</SectionTitle>
            {priorityData.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-2">Yok</div>
            ) : (
              <div className="space-y-2">
                {priorityData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent meetings */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionTitle>Son Görüşmeler</SectionTitle>
            {(stats?.recentMeetings ?? []).length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-2">Kayıt yok</div>
            ) : (
              <div className="space-y-2.5">
                {stats?.recentMeetings.map((m) => (
                  <div key={m.id} className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.meetingType === 'CALL' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                      {m.meetingType === 'CALL'
                        ? <Phone className="w-2.5 h-2.5 text-purple-500" />
                        : <Users className="w-2.5 h-2.5 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 truncate">{m.title}</div>
                      <div className="text-[10px] text-gray-400">
                        {m.customerShortCode} · {new Date(m.meetingDate).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Quote summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-500 shrink-0" />
          <div>
            <div className="text-2xl font-bold text-green-600">{stats?.quotes.approved ?? 0}</div>
            <div className="text-sm text-gray-500">Onaylanan Teklif</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <XCircle className="w-10 h-10 text-red-400 shrink-0" />
          <div>
            <div className="text-2xl font-bold text-red-500">{stats?.quotes.rejected ?? 0}</div>
            <div className="text-sm text-gray-500">Reddedilen Teklif</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <FileText className="w-10 h-10 text-blue-400 shrink-0" />
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats?.quotes.revised ?? 0}</div>
            <div className="text-sm text-gray-500">Revize Edilen Teklif</div>
          </div>
        </div>
      </div>

      {/* Row 6: Monthly Revenue chart */}
      {revenueMonthData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionTitle>Son 6 Ay — Tahsilat Geliri</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenueMonthData} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                formatter={(v: number | undefined) => [fmt(v ?? 0), 'Gelir']}
              />
              <Bar dataKey="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 7: Expiring certificates (only when data exists) */}
      {expiringCerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <SectionTitle>Sona Erecek Sertifikalar (30 gün)</SectionTitle>
          </div>
          <div className="space-y-2">
            {expiringCerts.map((cert) => {
              const isExpired = cert.daysLeft < 0;
              const isUrgent = cert.daysLeft <= 7;
              return (
                <div key={cert.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                    isExpired ? 'bg-red-100 text-red-700' :
                    isUrgent  ? 'bg-red-100 text-red-700' :
                               'bg-orange-100 text-orange-700'
                  }`}>
                    {isExpired ? 'Doldu' : `${cert.daysLeft}g`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-800">{cert.certType}</span>
                    {cert.ship && (
                      <span className="text-xs text-gray-400 ml-2">{cert.ship.name}</span>
                    )}
                    {cert.certNo && (
                      <span className="text-[10px] font-mono text-gray-400 ml-2">{cert.certNo}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(cert.expiryDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
