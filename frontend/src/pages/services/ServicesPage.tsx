import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ship, X } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { servicesApi, type Service } from '@/api/services';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import ServiceFormDialog from './ServiceFormDialog';
import ServiceDetailDrawer from './ServiceDetailDrawer';

// ── status / priority config ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  ON_HOLD: 'bg-orange-100 text-orange-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
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

function PriorityBadge({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`services.priority.${value}`, value)}
    </span>
  );
}

// ── columns ───────────────────────────────────────────────────────────────────

function useColumns(): Column<Service>[] {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return [
    {
      key: 'customer',
      label: t('services.fields.customer'),
      sortable: false,
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.customer?.name ?? '—'}</div>
          <div className="text-xs text-gray-400">{row.customer?.shortCode}</div>
        </div>
      ),
    },
    {
      key: 'ship',
      label: t('services.fields.ship'),
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Ship className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{row.ship?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'serviceType',
      label: t('services.fields.serviceType'),
      sortable: false,
      render: (row) => {
        if (!row.serviceType) return <span className="text-gray-400">—</span>;
        const label = lang === 'tr' ? row.serviceType.nameTr : row.serviceType.nameEn;
        return (
          <div>
            <div>{label}</div>
            <div className="text-xs text-gray-400 font-mono">{row.serviceType.code}</div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: t('services.fields.status'),
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: 'priority',
      label: t('services.fields.priority'),
      sortable: true,
      align: 'center',
      render: (row) => <PriorityBadge value={row.priority} />,
    },
    {
      key: 'startDate',
      label: t('services.fields.startDate'),
      sortable: true,
      render: (row) =>
        row.startDate
          ? new Date(row.startDate).toLocaleDateString('tr-TR')
          : <span className="text-gray-400">—</span>,
    },
    {
      key: 'assignedUser',
      label: t('services.fields.assignedUser'),
      sortable: false,
      render: (row) => row.assignedUser?.name ?? <span className="text-gray-400">—</span>,
    },
  ];
}

// ── page ──────────────────────────────────────────────────────────────────────

type DialogMode = 'add' | 'edit' | null;

export default function ServicesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const columns = useColumns();

  // Debounce search
  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['services', page, debouncedSearch, statusFilter, priorityFilter, serviceTypeFilter, sortBy, sortOrder],
    queryFn: () =>
      servicesApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        serviceTypeId: serviceTypeFilter ? Number(serviceTypeFilter) : undefined,
        sortBy,
        sortOrder,
      }).then((r) => r.data),
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => servicesApi.types().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  function handleRowClick(row: Service) {
    setSelectedId((prev) => (prev === row.id ? null : row.id));
    setDetailId(row.id);
  }

  function handleSortChange(key: string, order: 'asc' | 'desc') {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }

  function handleAdd() {
    setDialog('add');
  }

  function handleEdit() {
    if (selectedId) { setDetailId(null); setDialog('edit'); }
  }

  function handleDeleteClick() {
    const row = data?.data.find((s) => s.id === selectedId);
    if (row) setDeleteTarget(row);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['services'] });
    setDialog(null);
    setSelectedId(null);
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full p-6">
      <PageHeader
        title={t('services.title')}
        selectedId={selectedId}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('services.filter.search')}
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

        {/* Service Type */}
        <select
          value={serviceTypeFilter}
          onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('services.filter.serviceType')}: {t('common.all')}</option>
          {serviceTypes?.map((st) => (
            <option key={st.id} value={st.id}>{st.nameTr}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('services.filter.status')}: {t('common.all')}</option>
          <option value="OPEN">{t('status.open')}</option>
          <option value="IN_PROGRESS">{t('status.inProgress')}</option>
          <option value="ON_HOLD">{t('status.onHold')}</option>
          <option value="COMPLETED">{t('status.completed')}</option>
          <option value="CANCELLED">{t('status.cancelled')}</option>
        </select>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('services.filter.priority')}: {t('common.all')}</option>
          <option value="URGENT">{t('services.priority.URGENT')}</option>
          <option value="HIGH">{t('services.priority.HIGH')}</option>
          <option value="MEDIUM">{t('services.priority.MEDIUM')}</option>
          <option value="LOW">{t('services.priority.LOW')}</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid<Service>
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
        <ServiceFormDialog
          open={!!dialog}
          mode={dialog}
          serviceId={dialog === 'edit' ? selectedId : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Detail drawer */}
      {detailId && (
        <ServiceDetailDrawer
          serviceId={detailId}
          onClose={() => { setDetailId(null); setSelectedId(null); }}
          onEdit={() => { setDetailId(null); setDialog('edit'); }}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.cannotDelete').replace('Cannot', 'Sil').replace('Sil', t('common.delete'))}
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
        <p className="text-sm text-gray-600">{t('services.deleteConfirm')}</p>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </p>
        )}
      </Modal>
    </div>
  );
}
