import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { tasksApi, type Task, type TaskStatus, type TaskPriority } from '@/api/tasks';
import TaskFormDialog from './TaskFormDialog';

const STATUS_VARIANT: Record<TaskStatus, 'success' | 'warning' | 'muted' | 'destructive'> = {
  TODO: 'muted',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  CANCELLED: 'destructive',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600 font-semibold',
};

export default function TasksPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'add' | 'edit' }>({
    open: false, mode: 'add',
  });

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', page, pageSize, debouncedSearch, statusFilter, priorityFilter, sortBy, sortOrder],
    queryFn: () =>
      tasksApi.list({
        page, pageSize,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sortBy, sortOrder,
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
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

  function handleRowClick(row: Task) {
    setSelectedId((prev) => (prev === row.id ? null : row.id));
  }

  function handleDelete() {
    if (!selectedRow) return;
    if (!confirm(t('tasks.deleteConfirm'))) return;
    deleteMutation.mutate(selectedRow.id);
  }

  function handleEdit() {
    if (!selectedId) return;
    setDialog({ open: true, mode: 'edit' });
  }

  const columns: Column<Task>[] = [
    {
      key: 'priority',
      label: t('tasks.fields.priority'),
      width: 'w-24',
      render: (row) => (
        <span className={`text-xs ${PRIORITY_COLORS[row.priority]}`}>
          {t(`tasks.priority.${row.priority}`)}
        </span>
      ),
    },
    {
      key: 'title',
      label: t('tasks.fields.title'),
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{row.title}</div>
          {row.description && (
            <div className="text-xs text-gray-400 truncate max-w-xs">
              {row.description.slice(0, 80)}{row.description.length > 80 ? '…' : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('tasks.fields.status'),
      sortable: true,
      width: 'w-32',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]}>
          {t(`tasks.status.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'assignedUser',
      label: t('tasks.fields.assignedUser'),
      width: 'w-36',
      render: (row) => row.assignedUser
        ? <span className="text-sm">{row.assignedUser.name}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'dueDate',
      label: t('tasks.fields.dueDate'),
      sortable: true,
      width: 'w-28',
      render: (row) => {
        if (!row.dueDate) return <span className="text-gray-300">—</span>;
        const d = new Date(row.dueDate);
        const isOverdue = row.status !== 'DONE' && row.status !== 'CANCELLED' && d < new Date();
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
            {d.toLocaleDateString('tr-TR')}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('tasks.fields.createdAt'),
      sortable: true,
      width: 'w-28',
      render: (row) => (
        <span className="text-xs text-gray-500">
          {new Date(row.createdAt).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'TODO', label: t('tasks.status.TODO') },
    { value: 'IN_PROGRESS', label: t('tasks.status.IN_PROGRESS') },
    { value: 'DONE', label: t('tasks.status.DONE') },
    { value: 'CANCELLED', label: t('tasks.status.CANCELLED') },
  ];

  const priorityOptions = [
    { value: '', label: t('common.all') },
    { value: 'LOW', label: t('tasks.priority.LOW') },
    { value: 'MEDIUM', label: t('tasks.priority.MEDIUM') },
    { value: 'HIGH', label: t('tasks.priority.HIGH') },
    { value: 'URGENT', label: t('tasks.priority.URGENT') },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        title={t('tasks.title')}
        selectedId={selectedId}
        onAdd={() => setDialog({ open: true, mode: 'add' })}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addLabel={t('tasks.addTitle')}
      />

      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder={t('tasks.filter.search')}
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
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={statusOptions}
          className="w-36"
        />

        <NativeSelect
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          options={priorityOptions}
          className="w-32"
        />
      </div>

      <div className="flex-1 min-h-0">
        <DataGrid
          columns={columns}
          rows={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          sortBy={sortBy}
          sortOrder={sortOrder}
          loading={isLoading}
          selectedId={selectedId}
          onRowClick={handleRowClick}
          onSortChange={handleSort}
          onPageChange={setPage}
        />
      </div>

      <TaskFormDialog
        open={dialog.open}
        mode={dialog.mode}
        taskId={dialog.mode === 'edit' ? selectedId : null}
        onClose={() => setDialog({ open: false, mode: 'add' })}
        onSaved={() => {
          setDialog({ open: false, mode: 'add' });
          qc.invalidateQueries({ queryKey: ['tasks'] });
          if (dialog.mode === 'add') setSelectedId(null);
        }}
      />
    </div>
  );
}
