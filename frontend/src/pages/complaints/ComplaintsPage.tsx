import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { complaintsApi, type Complaint, type ComplaintStatus, type ComplaintType } from '@/api/complaints';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import ComplaintFormDialog from './ComplaintFormDialog';

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  OPEN: 'bg-orange-100 text-orange-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Açık',
  IN_PROGRESS: 'İşlemde',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapatıldı',
};

const TYPE_LABELS: Record<ComplaintType, string> = {
  COMPLAINT: 'Şikayet',
  FEEDBACK: 'Geri Bildirim',
  SUGGESTION: 'Öneri',
};

const TYPE_COLORS: Record<ComplaintType, string> = {
  COMPLAINT: 'bg-red-50 text-red-700',
  FEEDBACK: 'bg-blue-50 text-blue-700',
  SUGGESTION: 'bg-purple-50 text-purple-700',
};

function StatusBadge({ value }: { value: ComplaintStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[value] ?? value}
    </span>
  );
}

function TypeBadge({ value }: { value: ComplaintType }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {TYPE_LABELS[value] ?? value}
    </span>
  );
}

// ── Columns ────────────────────────────────────────────────────────────────────

function useColumns(): Column<Complaint>[] {
  return [
    {
      key: 'submittedAt',
      label: 'Tarih',
      sortable: true,
      render: (row) => new Date(row.submittedAt).toLocaleDateString('tr-TR'),
    },
    {
      key: 'subject',
      label: 'Konu',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-800 truncate max-w-xs">{row.subject}</div>
          <div className="text-xs text-gray-400 truncate max-w-xs">{row.description.slice(0, 60)}{row.description.length > 60 ? '...' : ''}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tür',
      sortable: false,
      align: 'center',
      render: (row) => <TypeBadge value={row.type} />,
    },
    {
      key: 'customer',
      label: 'Müşteri / İletişim',
      sortable: false,
      render: (row) => {
        if (row.customer) {
          return (
            <div>
              <div className="font-medium text-gray-800">{row.customer.name}</div>
              <div className="text-xs text-gray-400">{row.customer.shortCode}</div>
            </div>
          );
        }
        if (row.contactName || row.contactEmail) {
          return (
            <div>
              <div className="font-medium text-gray-700">{row.contactName ?? '—'}</div>
              <div className="text-xs text-gray-400">{row.contactEmail}</div>
            </div>
          );
        }
        return <span className="text-gray-400">—</span>;
      },
    },
    {
      key: 'status',
      label: 'Durum',
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge value={row.status} />,
    },
  ];
}

// ── Page ───────────────────────────────────────────────────────────────────────

type DialogMode = 'add' | 'edit' | null;

export default function ComplaintsPage() {
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);

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
    queryKey: ['complaints', page, debouncedSearch, statusFilter, typeFilter, sortBy, sortOrder],
    queryFn: () =>
      complaintsApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        sortBy,
        sortOrder,
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => complaintsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  function handleRowClick(row: Complaint) {
    setSelectedId((prev) => (prev === row.id ? null : row.id));
  }

  function handleSortChange(key: string, order: 'asc' | 'desc') {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }

  function handleEdit() {
    if (selectedId) setDialog('edit');
  }

  function handleDeleteClick() {
    const row = data?.data.find((s) => s.id === selectedId);
    if (row) setDeleteTarget(row);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['complaints'] });
    setDialog(null);
    setSelectedId(null);
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full p-6">
      <PageHeader
        title="Şikayetler"
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
            placeholder="Konu, açıklama veya müşteri ara..."
            className="h-9 pl-3 pr-8 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 w-72"
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
          <option value="">Durum: Tümü</option>
          <option value="OPEN">Açık</option>
          <option value="IN_PROGRESS">İşlemde</option>
          <option value="RESOLVED">Çözüldü</option>
          <option value="CLOSED">Kapatıldı</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">Tür: Tümü</option>
          <option value="COMPLAINT">Şikayet</option>
          <option value="FEEDBACK">Geri Bildirim</option>
          <option value="SUGGESTION">Öneri</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid<Complaint>
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
        <ComplaintFormDialog
          open={!!dialog}
          mode={dialog}
          complaintId={dialog === 'edit' ? selectedId : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Şikayeti Sil"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              Sil
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Bu şikayeti silmek istediğinizden emin misiniz?</p>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Bir hata oluştu'}
          </p>
        )}
      </Modal>
    </div>
  );
}
