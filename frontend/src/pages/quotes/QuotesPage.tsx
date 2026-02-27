import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { quotesApi, type Quote } from '@/api/quotes';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import QuoteFormDialog from './QuoteFormDialog';
import QuoteDetailDrawer from './QuoteDetailDrawer';

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISED: 'bg-orange-100 text-orange-800',
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

function PriceCell({ priceEur, priceUsd, priceTry }: { priceEur?: number; priceUsd?: number; priceTry?: number }) {
  const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  if (!priceEur && !priceUsd && !priceTry) return <span className="text-gray-400">—</span>;
  return (
    <div className="text-xs space-y-0.5">
      {priceEur != null && <div className="font-mono text-blue-700">{fmt(priceEur)} <span className="text-[10px] font-bold">EUR</span></div>}
      {priceUsd != null && <div className="font-mono text-green-700">{fmt(priceUsd)} <span className="text-[10px] font-bold">USD</span></div>}
      {priceTry != null && <div className="font-mono text-red-700">{fmt(priceTry)} <span className="text-[10px] font-bold">TRY</span></div>}
    </div>
  );
}

// ── Columns ────────────────────────────────────────────────────────────────────

function useColumns(): Column<Quote>[] {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return [
    {
      key: 'quoteNumber',
      label: t('quotes.fields.quoteNumber'),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-gray-700">{row.quoteNumber}</span>
      ),
    },
    {
      key: 'customer',
      label: t('quotes.fields.customer'),
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
      label: t('quotes.fields.service'),
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
      key: 'priceEur',
      label: 'Fiyat',
      sortable: false,
      render: (row) => <PriceCell priceEur={row.priceEur ?? undefined} priceUsd={row.priceUsd ?? undefined} priceTry={row.priceTry ?? undefined} />,
    },
    {
      key: 'status',
      label: t('quotes.fields.status'),
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: 'quoteDate',
      label: t('quotes.fields.quoteDate'),
      sortable: true,
      render: (row) => new Date(row.quoteDate).toLocaleDateString('tr-TR'),
    },
  ];
}

// ── Page ───────────────────────────────────────────────────────────────────────

type DialogMode = 'add' | 'edit' | null;

export default function QuotesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('quoteDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);

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
    queryKey: ['quotes', page, debouncedSearch, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      quotesApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  function handleRowClick(row: Quote) {
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
    const row = data?.data.find((q) => q.id === selectedId);
    if (row) setDeleteTarget(row);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['quotes'] });
    setDialog(null);
    setSelectedId(null);
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full p-6">
      <PageHeader
        title={t('quotes.title')}
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
            placeholder={t('quotes.filter.search')}
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
          <option value="">{t('quotes.filter.status')}: {t('common.all')}</option>
          <option value="DRAFT">{t('status.draft')}</option>
          <option value="SENT">{t('status.sent')}</option>
          <option value="APPROVED">{t('status.approved')}</option>
          <option value="REJECTED">{t('status.rejected')}</option>
          <option value="REVISED">{t('status.revised')}</option>
          <option value="CANCELLED">{t('status.cancelled')}</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid<Quote>
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

      {dialog && (
        <QuoteFormDialog
          open={!!dialog}
          mode={dialog}
          quoteId={dialog === 'edit' ? selectedId : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {detailId && (
        <QuoteDetailDrawer
          quoteId={detailId}
          onClose={() => { setDetailId(null); setSelectedId(null); }}
          onEdit={() => { setDetailId(null); setDialog('edit'); }}
        />
      )}

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
        <p className="text-sm text-gray-600">{t('quotes.deleteConfirm')}</p>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </p>
        )}
      </Modal>
    </div>
  );
}
