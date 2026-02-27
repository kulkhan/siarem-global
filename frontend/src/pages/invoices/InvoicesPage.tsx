import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { invoicesApi, type Invoice } from '@/api/invoices';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import InvoiceFormDialog from './InvoiceFormDialog';
import InvoiceDetailDrawer from './InvoiceDetailDrawer';

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

function StatusBadge({ value }: { value: string }) {
  const { t } = useTranslation();
  const key = value.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`status.${key}`, value)}
    </span>
  );
}

function AmountCell({ amount, currency }: { amount: number; currency: string }) {
  const formatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  const currencyColor: Record<string, string> = {
    EUR: 'bg-blue-50 text-blue-700',
    USD: 'bg-green-50 text-green-700',
    TRY: 'bg-red-50 text-red-700',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-medium text-gray-800">{formatted}</span>
      <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${currencyColor[currency] ?? 'bg-gray-100 text-gray-600'}`}>
        {currency}
      </span>
    </div>
  );
}

// ── Columns ────────────────────────────────────────────────────────────────────

function useColumns(): Column<Invoice>[] {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const now = new Date();

  return [
    {
      key: 'refNo',
      label: t('invoices.fields.refNo'),
      sortable: false,
      render: (row) =>
        row.refNo
          ? <span className="font-mono text-xs text-gray-700">{row.refNo}</span>
          : <span className="text-gray-400">—</span>,
    },
    {
      key: 'customer',
      label: t('invoices.fields.customer'),
      sortable: false,
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.customer?.name ?? '—'}</div>
          <div className="text-xs text-gray-400">{row.customer?.shortCode}</div>
        </div>
      ),
    },
    {
      key: 'service',
      label: t('invoices.fields.service'),
      sortable: false,
      render: (row) => {
        if (!row.service) return <span className="text-gray-400">—</span>;
        const stLabel = row.service.serviceType
          ? (lang === 'tr' ? row.service.serviceType.nameTr : row.service.serviceType.nameEn)
          : '—';
        return (
          <div>
            <div className="text-xs">{stLabel}</div>
            {row.service.ship && <div className="text-xs text-gray-400">{row.service.ship.name}</div>}
          </div>
        );
      },
    },
    {
      key: 'amount',
      label: t('invoices.fields.amount'),
      sortable: true,
      render: (row) => <AmountCell amount={row.amount} currency={row.currency} />,
    },
    {
      key: 'status',
      label: t('invoices.fields.status'),
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: 'invoiceDate',
      label: t('invoices.fields.invoiceDate'),
      sortable: true,
      render: (row) => new Date(row.invoiceDate).toLocaleDateString('tr-TR'),
    },
    {
      key: 'dueDate',
      label: t('invoices.fields.dueDate'),
      sortable: true,
      render: (row) => {
        if (!row.dueDate) return <span className="text-gray-400">—</span>;
        const due = new Date(row.dueDate);
        const isOverdue = due < now && row.status !== 'PAID' && row.status !== 'CANCELLED';
        return (
          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
            {due.toLocaleDateString('tr-TR')}
          </span>
        );
      },
    },
  ];
}

// ── Page ───────────────────────────────────────────────────────────────────────

type DialogMode = 'add' | 'edit' | null;

export default function InvoicesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [sortBy, setSortBy] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const columns = useColumns();

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, debouncedSearch, statusFilter, currencyFilter, sortBy, sortOrder],
    queryFn: () =>
      invoicesApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        currency: currencyFilter || undefined,
        sortBy,
        sortOrder,
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  function handleRowClick(row: Invoice) {
    setSelectedId((prev) => (prev === row.id ? null : row.id));
    setDetailId(row.id);
  }

  function handleSortChange(key: string, order: 'asc' | 'desc') {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }

  function handleEdit() {
    if (selectedId) { setDetailId(null); setDialog('edit'); }
  }

  function handleDeleteClick() {
    const row = data?.data.find((s) => s.id === selectedId);
    if (row) setDeleteTarget(row);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['invoices'] });
    setDialog(null);
    setSelectedId(null);
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full p-6">
      <PageHeader
        title={t('invoices.title')}
        selectedId={selectedId}
        onAdd={() => setDialog('add')}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('invoices.filter.search')}
            className="h-9 pl-3 pr-8 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 w-64"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('invoices.filter.status')}: {t('common.all')}</option>
          <option value="DRAFT">{t('status.draft')}</option>
          <option value="SENT">{t('status.sent')}</option>
          <option value="PARTIALLY_PAID">{t('status.partiallyPaid')}</option>
          <option value="PAID">{t('status.paid')}</option>
          <option value="OVERDUE">{t('status.overdue')}</option>
          <option value="CANCELLED">{t('status.cancelled')}</option>
        </select>

        <select
          value={currencyFilter}
          onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('invoices.filter.currency')}: {t('common.all')}</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="TRY">TRY</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid<Invoice>
          columns={columns}
          rows={rows}
          total={total}
          page={page}
          pageSize={20}
          sortBy={sortBy}
          sortOrder={sortOrder}
          loading={isLoading}
          selectedId={selectedId}
          onRowClick={handleRowClick}
          onSortChange={handleSortChange}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Dialog */}
      {dialog && (
        <InvoiceFormDialog
          open={!!dialog}
          mode={dialog}
          invoiceId={dialog === 'edit' ? selectedId : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Detail drawer */}
      {detailId && (
        <InvoiceDetailDrawer
          invoiceId={detailId}
          onClose={() => { setDetailId(null); setSelectedId(null); }}
          onEdit={() => { setDetailId(null); setDialog('edit'); }}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{t('invoices.deleteConfirm')}</p>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </p>
        )}
      </Modal>
    </div>
  );
}
