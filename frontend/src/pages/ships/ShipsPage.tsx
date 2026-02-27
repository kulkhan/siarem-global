import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { shipsApi, type Ship } from '@/api/ships';
import ShipFormDialog from './ShipFormDialog';

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, 'success' | 'muted' | 'warning' | 'destructive'> = {
  ACTIVE: 'success',
  PASSIVE: 'muted',
  SOLD: 'warning',
  SCRAPPED: 'destructive',
};

export default function ShipsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [shipTypeId, setShipTypeId] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'add' | 'edit' }>({
    open: false, mode: 'add',
  });

  useEffect(() => {
    const id = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['ships', page, debouncedSearch, shipTypeId, status, sortBy, sortOrder],
    queryFn: () =>
      shipsApi.list({
        page, pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        shipTypeId: shipTypeId ? parseInt(shipTypeId) : undefined,
        status: status || undefined,
        sortBy, sortOrder,
      }).then((r) => r.data),
  });

  const { data: shipTypes } = useQuery({
    queryKey: ['ship-types'],
    queryFn: () => shipsApi.types().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shipsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ships'] }); setSelectedId(null); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || t('common.error'));
    },
  });

  const selectedRow = data?.data.find((r) => r.id === selectedId) ?? null;

  function handleSort(key: string, order: 'asc' | 'desc') { setSortBy(key); setSortOrder(order); setPage(1); }
  function handleRowClick(row: Ship) { setSelectedId((p) => (p === row.id ? null : row.id)); }
  function handleDelete() {
    if (!selectedRow) return;
    if (!confirm(t('ships.deleteConfirm', { name: selectedRow.name }))) return;
    deleteMutation.mutate(selectedRow.id);
  }

  const columns: Column<Ship>[] = [
    {
      key: 'name',
      label: t('ships.fields.name'),
      sortable: true,
      render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
    },
    {
      key: 'imoNumber',
      label: t('ships.fields.imoNumber'),
      width: 'w-28',
      render: (row) =>
        row.imoNumber ? (
          <span className="font-mono text-xs text-gray-600">{row.imoNumber}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'customer',
      label: t('ships.fields.customer'),
      sortable: false,
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-800">{row.customer?.name ?? '—'}</div>
          {row.customer?.shortCode && (
            <div className="text-xs text-gray-400 font-mono">{row.customer.shortCode}</div>
          )}
        </div>
      ),
    },
    {
      key: 'shipType',
      label: t('ships.fields.shipType'),
      width: 'w-40',
      render: (row) =>
        row.shipType ? (
          <span className="text-sm text-gray-600">{row.shipType.name}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'flag',
      label: t('ships.fields.flag'),
      sortable: true,
      width: 'w-28',
      render: (row) => row.flag ?? <span className="text-gray-300">—</span>,
    },
    {
      key: 'grossTonnage',
      label: 'GT',
      width: 'w-20',
      align: 'right',
      render: (row) =>
        row.grossTonnage != null ? (
          <span className="text-sm">{row.grossTonnage.toLocaleString()}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'classificationSociety',
      label: t('ships.fields.classificationSociety'),
      width: 'w-20',
      align: 'center',
      render: (row) =>
        row.classificationSociety ? (
          <Badge variant="info" className="text-xs">{row.classificationSociety}</Badge>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'status',
      label: t('ships.fields.status'),
      sortable: true,
      width: 'w-24',
      align: 'center',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'muted'}>
          {t(`status.${row.status.toLowerCase()}`)}
        </Badge>
      ),
    },
  ];

  const shipTypeOptions = [
    { value: '', label: t('common.all') },
    ...(shipTypes ?? []).map((st) => ({ value: String(st.id), label: st.name })),
  ];

  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'ACTIVE', label: t('status.active') },
    { value: 'PASSIVE', label: t('status.passive') },
    { value: 'SOLD', label: t('status.sold') },
    { value: 'SCRAPPED', label: t('status.scrapped') },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        title={t('ships.title')}
        selectedId={selectedId}
        onAdd={() => setDialog({ open: true, mode: 'add' })}
        onEdit={() => selectedId && setDialog({ open: true, mode: 'edit' })}
        onDelete={handleDelete}
        addLabel={t('ships.addTitle')}
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder={t('ships.filter.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <NativeSelect
          value={shipTypeId}
          onChange={(e) => { setShipTypeId(e.target.value); setPage(1); }}
          options={shipTypeOptions}
          className="w-48"
        />

        <NativeSelect
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={statusOptions}
          className="w-32"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid
          columns={columns}
          rows={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          sortBy={sortBy}
          sortOrder={sortOrder}
          loading={isLoading}
          selectedId={selectedId}
          onRowClick={handleRowClick}
          onSortChange={handleSort}
          onPageChange={setPage}
        />
      </div>

      <ShipFormDialog
        open={dialog.open}
        mode={dialog.mode}
        shipId={dialog.mode === 'edit' ? selectedId : null}
        onClose={() => setDialog({ open: false, mode: 'add' })}
        onSaved={() => {
          setDialog({ open: false, mode: 'add' });
          qc.invalidateQueries({ queryKey: ['ships'] });
          qc.invalidateQueries({ queryKey: ['customers'] });
          if (dialog.mode === 'add') setSelectedId(null);
        }}
      />
    </div>
  );
}
