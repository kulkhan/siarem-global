import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, X, Ship } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { customersApi, type Customer } from '@/api/customers';
import CustomerFormDialog from './CustomerFormDialog';
import CustomerDetailDrawer from './CustomerDetailDrawer';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [country, setCountry] = useState('');
  const [isActive, setIsActive] = useState<'' | 'true' | 'false'>('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'add' | 'edit' }>({
    open: false, mode: 'add',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, debouncedSearch, country, isActive, sortBy, sortOrder],
    queryFn: () =>
      customersApi.list({
        page, pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        country: country || undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        sortBy, sortOrder,
      }).then((r) => r.data),
  });

  const { data: countryData } = useQuery({
    queryKey: ['customer-countries'],
    queryFn: () => customersApi.countryOptions().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setSelectedId(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || t('common.error'));
    },
  });

  const selectedRow = data?.data.find((r) => r.id === selectedId) ?? null;

  function handleSort(key: string, order: 'asc' | 'desc') {
    setSortBy(key); setSortOrder(order); setPage(1);
  }

  function handleRowClick(row: Customer) {
    setSelectedId((prev) => (prev === row.id ? null : row.id));
    setDetailId(row.id);
  }

  function handleDelete() {
    if (!selectedRow) return;
    if (!confirm(t('customers.deleteConfirm', { name: selectedRow.name }))) return;
    deleteMutation.mutate(selectedRow.id);
  }

  function handleEdit() {
    if (!selectedId) return;
    setDetailId(null);
    setDialog({ open: true, mode: 'edit' });
  }

  function handleAdd() {
    setDialog({ open: true, mode: 'add' });
  }

  function handleDialogClose() {
    setDialog({ open: false, mode: 'add' });
  }

  // Columns
  const columns: Column<Customer>[] = [
    {
      key: 'shortCode',
      label: t('customers.fields.shortCode'),
      sortable: true,
      width: 'w-28',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
          {row.shortCode}
        </span>
      ),
    },
    {
      key: 'name',
      label: t('customers.fields.name'),
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      key: 'country',
      label: t('customers.fields.country'),
      sortable: true,
      width: 'w-36',
      render: (row) => {
        const parts = [row.city, row.country].filter(Boolean);
        return parts.length ? <span>{parts.join(', ')}</span> : <span className="text-gray-300">—</span>;
      },
    },
    {
      key: 'phone',
      label: t('customers.fields.phone'),
      width: 'w-36',
      render: (row) => row.phone ?? <span className="text-gray-300">—</span>,
    },
    {
      key: 'shipCount',
      label: t('customers.fields.shipCount'),
      sortable: true,
      width: 'w-20',
      align: 'center',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-gray-700">
          <Ship className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-semibold">{row._count?.ships ?? 0}</span>
        </span>
      ),
    },
    {
      key: 'isActive',
      label: t('customers.fields.status'),
      width: 'w-24',
      align: 'center',
      render: (row) =>
        row.isActive ? (
          <Badge variant="success">{t('status.active')}</Badge>
        ) : (
          <Badge variant="muted">{t('status.passive')}</Badge>
        ),
    },
  ];

  const countryOptions = [
    { value: '', label: t('common.all') },
    ...(countryData ?? []).map((c) => ({ value: c, label: c })),
  ];

  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'true', label: t('status.active') },
    { value: 'false', label: t('status.passive') },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        title={t('customers.title')}
        selectedId={selectedId}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addLabel={t('customers.addTitle')}
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder={t('customers.filter.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <NativeSelect
          value={country}
          onChange={(e) => { setCountry(e.target.value); setPage(1); }}
          options={countryOptions}
          className="w-36"
        />

        <NativeSelect
          value={isActive}
          onChange={(e) => { setIsActive(e.target.value as '' | 'true' | 'false'); setPage(1); }}
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

      {/* Form Dialog */}
      <CustomerFormDialog
        open={dialog.open}
        mode={dialog.mode}
        customerId={dialog.mode === 'edit' ? selectedId : null}
        onClose={handleDialogClose}
        onSaved={() => {
          handleDialogClose();
          qc.invalidateQueries({ queryKey: ['customers'] });
          if (dialog.mode === 'add') setSelectedId(null);
        }}
      />

      {detailId && !dialog.open && (
        <CustomerDetailDrawer
          customerId={detailId}
          onClose={() => { setDetailId(null); setSelectedId(null); }}
          onEdit={() => { setDetailId(null); setDialog({ open: true, mode: 'edit' }); }}
        />
      )}
    </div>
  );
}
