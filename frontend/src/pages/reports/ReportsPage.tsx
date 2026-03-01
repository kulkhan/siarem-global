import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, TrendingUp, Package, Wrench, Users } from 'lucide-react';
import { reportsApi } from '@/api/reports';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/select';

type Tab = 'revenue' | 'stock' | 'services' | 'customers';

const PERIOD_OPTIONS = [
  { value: '3', label: 'Son 3 Ay' },
  { value: '6', label: 'Son 6 Ay' },
  { value: '12', label: 'Son 12 Ay' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af', SENT: '#3b82f6', PARTIALLY_PAID: '#f59e0b',
  PAID: '#22c55e', OVERDUE: '#ef4444', CANCELLED: '#d1d5db',
  OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', COMPLETED: '#22c55e', ON_HOLD: '#8b5cf6',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#d1d5db',
};

function fmt(v: number | undefined | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v));
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
}

function downloadCsv(rows: string[][], filename: string) {
  const content = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Revenue Tab ────────────────────────────────────────────────────────────────
function RevenueTab({ months }: { months: number }) {
  const { t } = useTranslation();
  const { data: res, isLoading } = useQuery({
    queryKey: ['report-revenue', months],
    queryFn: () => reportsApi.revenue(months),
  });
  const d = res?.data.data;

  const chartData = (d?.monthly ?? []).map((m) => ({
    month: fmtMonth(m.month),
    total: Number(m.total),
  }));

  function handleExport() {
    if (!d) return;
    downloadCsv(
      [['Ay', 'Toplam'], ...chartData.map((r) => [r.month, String(r.total)])],
      'gelir-raporu.csv'
    );
  }

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Monthly bar chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">{t('reports.revenueMonthly')}</h3>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('reports.exportCsv')}
          </Button>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{t('common.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Invoice by status */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">{t('reports.invoiceByStatus')}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-5 py-2 font-medium">{t('common.status')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('common.count')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('common.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(d?.byStatus ?? []).map((row) => (
              <tr key={row.status}>
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[row.status] ?? '#9ca3af' }} />
                    {row.status}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right text-gray-700">{row._count.id}</td>
                <td className="px-5 py-2.5 text-right text-gray-700">{fmt(row._sum.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Overdue invoices */}
      {(d?.overdue ?? []).length > 0 && (
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 bg-red-50">
            <h3 className="text-sm font-semibold text-red-700">{t('reports.overdueInvoices')} ({d?.overdue.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50/50 text-xs text-gray-500">
                <th className="text-left px-5 py-2 font-medium">{t('invoices.fields.refNo')}</th>
                <th className="text-left px-5 py-2 font-medium">{t('common.customer')}</th>
                <th className="text-right px-5 py-2 font-medium">{t('invoices.fields.amount')}</th>
                <th className="text-right px-5 py-2 font-medium">{t('invoices.fields.dueDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {d?.overdue.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-2.5 font-mono text-xs">{inv.refNo ?? '—'}</td>
                  <td className="px-5 py-2.5 text-gray-700">{inv.customer.name}</td>
                  <td className="px-5 py-2.5 text-right text-red-700 font-medium">{fmt(inv.amount)} {inv.currency}</td>
                  <td className="px-5 py-2.5 text-right text-xs text-gray-500">
                    {new Date(inv.dueDate).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Stock Tab ──────────────────────────────────────────────────────────────────
function StockTab() {
  const { t } = useTranslation();
  const { data: res, isLoading } = useQuery({
    queryKey: ['report-stock'],
    queryFn: () => reportsApi.stock(),
  });
  const d = res?.data.data;

  function handleExport() {
    if (!d) return;
    downloadCsv(
      [
        ['Kod', 'Ad', 'Birim', 'Stok', 'Min. Stok'],
        ...(d.allProducts ?? []).map((p) => [
          p.code, p.name, p.unit,
          String(p.stockQuantity ?? '—'),
          String(p.minStock ?? '—'),
        ]),
      ],
      'stok-raporu.csv'
    );
  }

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>;

  const lowStock = d?.lowStock ?? [];
  const allProducts = d?.allProducts ?? [];

  return (
    <div className="space-y-6">
      {/* Critical stock */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-200">
            <h3 className="text-sm font-semibold text-red-700">{t('products.stockLow')} / {t('products.stockEmpty')} ({lowStock.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-red-50/60">
                <th className="text-left px-5 py-2 font-medium">{t('products.fields.code')}</th>
                <th className="text-left px-5 py-2 font-medium">{t('products.fields.nameTr')}</th>
                <th className="text-right px-5 py-2 font-medium">{t('products.stockQuantity')}</th>
                <th className="text-right px-5 py-2 font-medium">{t('products.minStock')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2.5 font-mono text-xs">{p.code}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-2.5 text-right text-red-700 font-semibold">{p.stock_quantity ?? p.stockQuantity ?? '—'} {p.unit}</td>
                  <td className="px-5 py-2.5 text-right text-gray-500 text-xs">{p.min_stock ?? p.minStock ?? '—'} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All products stock */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{t('products.inventory')}</h3>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('reports.exportCsv')}
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-5 py-2 font-medium">{t('products.fields.code')}</th>
              <th className="text-left px-5 py-2 font-medium">{t('products.fields.nameTr')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('products.stockQuantity')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('products.minStock')}</th>
              <th className="text-left px-5 py-2 font-medium">{t('products.stockStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allProducts.map((p) => {
              const stock = p.stockQuantity != null ? p.stockQuantity : null;
              const min = p.minStock != null ? p.minStock : null;
              const isEmpty = stock != null && stock <= 0;
              const isLow = stock != null && min != null && stock <= min;
              const statusClass = stock == null ? 'text-gray-400' : isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600';
              const statusLabel = stock == null ? t('products.stockUntracked') : isEmpty ? t('products.stockEmpty') : isLow ? t('products.stockLow') : t('products.stockOk');
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-mono text-xs">{p.code}</td>
                  <td className="px-5 py-2.5 text-gray-900">{p.name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{stock != null ? `${fmt(stock)} ${p.unit}` : '—'}</td>
                  <td className="px-5 py-2.5 text-right text-gray-500 text-xs">{min != null ? `${fmt(min)} ${p.unit}` : '—'}</td>
                  <td className={`px-5 py-2.5 text-xs font-medium ${statusClass}`}>{statusLabel}</td>
                </tr>
              );
            })}
            {allProducts.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Services Tab ───────────────────────────────────────────────────────────────
function ServicesTab({ months }: { months: number }) {
  const { t } = useTranslation();
  const { data: res, isLoading } = useQuery({
    queryKey: ['report-services', months],
    queryFn: () => reportsApi.services(months),
  });
  const d = res?.data.data;

  const statusData = (d?.byStatus ?? []).map((s) => ({
    name: s.status, value: s._count.id, fill: STATUS_COLORS[s.status] ?? '#9ca3af',
  }));

  const priorityData = (d?.byPriority ?? []).map((p) => ({
    name: p.priority, value: p._count.id, fill: PRIORITY_COLORS[p.priority] ?? '#9ca3af',
  }));

  const monthlyData = (d?.monthly ?? []).map((m) => ({
    month: fmtMonth(m.month), count: Number(m.count),
  }));

  function handleExport() {
    if (!d) return;
    downloadCsv(
      [['Durum', 'Adet'], ...(d.byStatus ?? []).map((s) => [s.status, String(s._count.id)])],
      'servis-raporu.csv'
    );
  }

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status pie */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">{t('reports.servicesByStatus')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">{t('reports.servicesByPriority')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">{t('reports.servicesMonthly')}</h3>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('reports.exportCsv')}
          </Button>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Customers Tab ──────────────────────────────────────────────────────────────
function CustomersTab() {
  const { t } = useTranslation();
  const { data: res, isLoading } = useQuery({
    queryKey: ['report-customers'],
    queryFn: () => reportsApi.customers(),
  });
  const d = res?.data.data;

  function handleExport() {
    if (!d) return;
    downloadCsv(
      [['Müşteri', 'Kod', 'Fatura Sayısı', 'Toplam Gelir'], ...(d.topByRevenue ?? []).map((r) => [r.customer?.name ?? '?', r.customer?.shortCode ?? '?', String(r.invoiceCount), String(r.totalRevenue ?? 0)])],
      'musteri-raporu.csv'
    );
  }

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Top by revenue */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{t('reports.topCustomersByRevenue')}</h3>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('reports.exportCsv')}
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-5 py-2 font-medium">#</th>
              <th className="text-left px-5 py-2 font-medium">{t('common.customer')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('reports.invoiceCount')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('reports.totalRevenue')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(d?.topByRevenue ?? []).map((row, i) => (
              <tr key={row.customer?.id ?? i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                <td className="px-5 py-2.5">
                  <p className="text-sm font-medium text-gray-900">{row.customer?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{row.customer?.shortCode}</p>
                </td>
                <td className="px-5 py-2.5 text-right text-gray-700">{row.invoiceCount}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{fmt(row.totalRevenue)}</td>
              </tr>
            ))}
            {(d?.topByRevenue ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Top by invoice count */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">{t('reports.topCustomersByCount')}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-5 py-2 font-medium">#</th>
              <th className="text-left px-5 py-2 font-medium">{t('common.customer')}</th>
              <th className="text-right px-5 py-2 font-medium">{t('reports.invoiceCount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(d?.topByInvoiceCount ?? []).map((row, i) => (
              <tr key={row.customer?.id ?? i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                <td className="px-5 py-2.5">
                  <p className="text-sm font-medium text-gray-900">{row.customer?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{row.customer?.shortCode}</p>
                </td>
                <td className="px-5 py-2.5 text-right text-gray-700 font-semibold">{row.invoiceCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('revenue');
  const [months, setMonths] = useState(6);

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'revenue', label: t('reports.revenue'), icon: TrendingUp },
    { id: 'stock', label: t('reports.stock'), icon: Package },
    { id: 'services', label: t('reports.services'), icon: Wrench },
    { id: 'customers', label: t('reports.customers'), icon: Users },
  ];

  const showPeriod = tab === 'revenue' || tab === 'services';

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        </div>
        {showPeriod && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('reports.period')}</span>
            <NativeSelect
              value={String(months)}
              onChange={(e) => setMonths(Number(e.target.value))}
              options={PERIOD_OPTIONS}
              className="w-36"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'revenue' && <RevenueTab months={months} />}
        {tab === 'stock' && <StockTab />}
        {tab === 'services' && <ServicesTab months={months} />}
        {tab === 'customers' && <CustomersTab />}
      </div>
    </div>
  );
}
