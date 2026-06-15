import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Bug, Sparkles, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { devTasksApi, DevTask } from '@/api/devTasks';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

// ── Types ────────────────────────────────────────────────────────────────────

const TASK_TYPES = ['FEATURE', 'BUG', 'IMPROVEMENT'] as const;
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(TASK_TYPES),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  reportedAt: z.string().min(1),
  completedAt: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    FEATURE:     { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   icon: <Sparkles className="w-3 h-3" /> },
    BUG:         { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',       icon: <Bug className="w-3 h-3" /> },
    IMPROVEMENT: { cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <TrendingUp className="w-3 h-3" /> },
  };
  const { cls, icon } = map[type] ?? { cls: 'bg-gray-100 text-gray-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {icon}{t(`devTasks.type.${type}`, type)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    TODO:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    DONE:        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    CANCELLED:   'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`devTasks.status.${status}`, status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    LOW:    'text-gray-400',
    MEDIUM: 'text-blue-500',
    HIGH:   'text-orange-500',
    URGENT: 'text-red-600 font-bold',
  };
  return <span className={`text-xs ${map[priority] ?? ''}`}>{t(`devTasks.priority.${priority}`, priority)}</span>;
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

function TaskFormDialog({ task, onClose }: { task: DevTask | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: task ? {
      title: task.title,
      description: task.description ?? '',
      type: task.type as typeof TASK_TYPES[number],
      status: task.status as typeof TASK_STATUSES[number],
      priority: task.priority as typeof TASK_PRIORITIES[number],
      reportedAt: toDateInput(task.reportedAt),
      completedAt: toDateInput(task.completedAt),
    } : {
      type: 'FEATURE',
      status: 'TODO',
      priority: 'MEDIUM',
      reportedAt: new Date().toISOString().slice(0, 10),
      completedAt: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        completedAt: data.completedAt || null,
      };
      return task ? devTasksApi.update(task.id, payload) : devTasksApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); onClose(); },
  });

  const inputCls = (err?: unknown) =>
    `w-full border rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary ${err ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {task ? t('devTasks.edit') : t('devTasks.add')}
        </h2>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.title')} *</label>
            <input {...register('title')} className={inputCls(errors.title)} />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{t('common.required')}</p>}
          </div>

          {/* Type / Status / Priority row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.type')}</label>
              <select {...register('type')} className={inputCls()}>
                {TASK_TYPES.map(v => <option key={v} value={v}>{t(`devTasks.type.${v}`, v)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.status')}</label>
              <select {...register('status')} className={inputCls()}>
                {TASK_STATUSES.map(v => <option key={v} value={v}>{t(`devTasks.status.${v}`, v)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.priority')}</label>
              <select {...register('priority')} className={inputCls()}>
                {TASK_PRIORITIES.map(v => <option key={v} value={v}>{t(`devTasks.priority.${v}`, v)}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.reportedAt')}</label>
              <input type="date" {...register('reportedAt')} className={inputCls(errors.reportedAt)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.completedAt')}</label>
              <input type="date" {...register('completedAt')} className={inputCls()} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('devTasks.fields.description')}</label>
            <textarea {...register('description')} rows={3} className={`${inputCls()} resize-none`} />
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-500">{t('common.error')}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isSubmitting || mutation.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DevTasksPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';
  const [dialogTask, setDialogTask] = useState<DevTask | null | 'new'>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['dev-tasks'],
    queryFn: () => devTasksApi.list(),
  });
  const tasks = res?.data.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => devTasksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-tasks'] }); setConfirmDeleteId(null); },
  });

  // Stats
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'DONE').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const bugs = tasks.filter(t => t.type === 'BUG' && t.status !== 'DONE').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('devTasks.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('devTasks.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setDialogTask('new')}>
          <Plus className="w-4 h-4 mr-1" />{t('devTasks.add')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: t('devTasks.stats.total'), value: total, cls: 'text-gray-700 dark:text-gray-200' },
          { label: t('devTasks.stats.inProgress'), value: inProgress, cls: 'text-yellow-600' },
          { label: t('devTasks.stats.done'), value: done, cls: 'text-green-600' },
          { label: t('devTasks.stats.openBugs'), value: bugs, cls: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">{t('devTasks.fields.reportedAt')}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">{t('devTasks.fields.type')}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('devTasks.fields.title')}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-20">{t('devTasks.fields.priority')}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">{t('devTasks.fields.status')}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">{t('devTasks.fields.createdBy')}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">{t('devTasks.fields.completedAt')}</th>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400">{t('common.loading')}</td></tr>
            )}
            {!isLoading && tasks.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400">{t('devTasks.empty')}</td></tr>
            )}
            {tasks.map(task => (
              <tr key={task.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                  {task.reportedAt ? new Date(task.reportedAt).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-2.5"><TypeBadge type={task.type} /></td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                </td>
                <td className="px-4 py-2.5"><PriorityBadge priority={task.priority} /></td>
                <td className="px-4 py-2.5"><StatusBadge status={task.status} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {task.createdByName ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                  {task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1">
                      {confirmDeleteId === task.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">{t('common.deleteConfirm')}</span>
                          <button onClick={() => deleteMutation.mutate(task.id)}
                            className="text-[10px] text-red-600 font-semibold hover:underline">{t('common.yes')}</button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-gray-500 font-semibold hover:underline">{t('common.no')}</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setDialogTask(task)}
                            className="p-1 text-gray-400 hover:text-primary rounded transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(task.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      {dialogTask !== null && (
        <TaskFormDialog
          task={dialogTask === 'new' ? null : dialogTask}
          onClose={() => setDialogTask(null)}
        />
      )}
    </div>
  );
}
