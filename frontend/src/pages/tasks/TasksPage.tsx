import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, X, CheckCircle } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { tasksApi, type Task, type TaskStatus, type TaskPriority } from '@/api/tasks';
import { useAuthStore } from '@/store/auth.store';
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

// ── Close Dialog ─────────────────────────────────────────────────────────────

function CloseTaskDialog({
  task,
  onClose,
  onConfirm,
  isPending,
}: {
  task: Task;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('tasks.close.title')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.title}</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('tasks.close.notePlaceholder')}
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-3"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? t('common.saving') : t('tasks.close.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'add' | 'edit' }>({
    open: false, mode: 'add',
  });
  const [closingTask, setClosingTask] = useState<Task | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', page, pageSize, debouncedSearch, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder],
    queryFn: () =>
      tasksApi.list({
        page, pageSize,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        sortBy, sortOrder,
      }).then((r) => r.data),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ['task-categories'],
    queryFn: () => tasksApi.getCategories().then(r => r.data.data),
    staleTime: 60000,
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

  const closeMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => tasksApi.close(id, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setClosingTask(null);
      setSelectedId(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || t('common.error'));
    },
  });

  const selectedRow = data?.data.find((r) => r.id === selectedId) ?? null;

  function canClose(task: Task) {
    if (task.status === 'DONE' || task.status === 'CANCELLED') return false;
    if (isAdmin) return true;
    if (!user) return false;
    return task.assignedUserIds?.includes(user.id) || task.assignedUserId === user.id;
  }

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

  const categoryOptions = [
    { value: '', label: t('common.all') },
    ...(categoriesRes ?? []).map(c => ({ value: c, label: c })),
  ];

  const columns: Column<Task>[] = [
    {
      key: 'priority',
      label: t('tasks.fields.priority'),
      width: 'w-20',
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
          {row.category && (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium mt-0.5 mr-1">
              {row.category}
            </span>
          )}
          {row.description && (
            <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
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
      render: (row) => {
        const multi = row.assignedUsers?.map(u => u.name).join(', ');
        const single = row.assignedUser?.name;
        const label = multi || single;
        return label
          ? <span className="text-sm">{label}</span>
          : <span className="text-gray-300">—</span>;
      },
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
    {
      key: 'actions' as keyof Task,
      label: '',
      width: 'w-14',
      render: (row) =>
        canClose(row) ? (
          <button
            onClick={(e) => { e.stopPropagation(); setClosingTask(row); }}
            title={t('tasks.close.button')}
            className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        ) : null,
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

      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
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

        {(categoriesRes ?? []).length > 0 && (
          <NativeSelect
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            options={categoryOptions}
            className="w-36"
          />
        )}
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

      {closingTask && (
        <CloseTaskDialog
          task={closingTask}
          onClose={() => setClosingTask(null)}
          onConfirm={(note) => closeMutation.mutate({ id: closingTask.id, note })}
          isPending={closeMutation.isPending}
        />
      )}
    </div>
  );
}
