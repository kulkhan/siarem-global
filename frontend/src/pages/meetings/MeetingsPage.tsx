import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Phone, Users } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { meetingsApi, type Meeting } from '@/api/meetings';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import MeetingFormDialog from './MeetingFormDialog';
import MeetingDetailDrawer from './MeetingDetailDrawer';

const TYPE_STYLES: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  MEETING: { bg: 'bg-blue-100 text-blue-700', label: 'Toplantı', icon: <Users className="w-3 h-3" /> },
  CALL: { bg: 'bg-purple-100 text-purple-700', label: 'Arama', icon: <Phone className="w-3 h-3" /> },
};

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const s = TYPE_STYLES[type] ?? TYPE_STYLES.MEETING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>
      {s.icon}
      {t(`meetings.type.${type}`, type)}
    </span>
  );
}

type DialogMode = 'add' | 'edit' | null;

export default function MeetingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('meetingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', page, debouncedSearch, typeFilter, sortBy, sortOrder],
    queryFn: () =>
      meetingsApi.list({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        meetingType: typeFilter || undefined,
        sortBy,
        sortOrder,
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  function handleRowClick(row: Meeting) {
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
    const row = data?.data.find((m) => m.id === selectedId);
    if (row) setDeleteTarget(row);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['meetings'] });
    setDialog(null);
    setSelectedId(null);
  }

  const columns: Column<Meeting>[] = [
    {
      key: 'meetingType',
      label: t('meetings.fields.type'),
      sortable: false,
      width: 'w-28',
      render: (row) => <TypeBadge type={row.meetingType} />,
    },
    {
      key: 'title',
      label: t('meetings.fields.title'),
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800 text-sm">{row.title}</div>
          {row.description && (
            <div className="text-xs text-gray-400 truncate max-w-xs">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      label: t('meetings.fields.customer'),
      sortable: false,
      render: (row) => (
        <div>
          <div className="text-sm font-semibold text-gray-800">{row.customer?.name ?? '—'}</div>
          <div className="text-xs text-gray-400">{row.customer?.shortCode}</div>
        </div>
      ),
    },
    {
      key: 'ship',
      label: t('meetings.fields.ship'),
      sortable: false,
      render: (row) => row.ship
        ? <span className="text-xs text-gray-600">{row.ship.name}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'meetingDate',
      label: t('meetings.fields.date'),
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm text-gray-700">{new Date(row.meetingDate).toLocaleDateString('tr-TR')}</div>
          {row.meetingType === 'CALL' && row.duration && (
            <div className="text-xs text-gray-400">{row.duration} dk</div>
          )}
          {row.meetingType === 'MEETING' && row.location && (
            <div className="text-xs text-gray-400">{row.location}</div>
          )}
        </div>
      ),
    },
    {
      key: 'followUpDate',
      label: t('meetings.fields.followUpDate'),
      sortable: true,
      render: (row) => row.followUpDate
        ? <span className="text-xs text-gray-600">{new Date(row.followUpDate).toLocaleDateString('tr-TR')}</span>
        : <span className="text-gray-300">—</span>,
    },
  ];

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full p-6">
      <PageHeader
        title={t('meetings.title')}
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
            placeholder={t('meetings.filter.search')}
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
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('meetings.fields.type')}: {t('common.all')}</option>
          <option value="MEETING">{t('meetings.type.MEETING')}</option>
          <option value="CALL">{t('meetings.type.CALL')}</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid<Meeting>
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
        <MeetingFormDialog
          open={!!dialog}
          mode={dialog}
          meetingId={dialog === 'edit' ? selectedId : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {detailId && (
        <MeetingDetailDrawer
          meetingId={detailId}
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
        <p className="text-sm text-gray-600">{t('meetings.deleteConfirm')}</p>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </p>
        )}
      </Modal>
    </div>
  );
}
