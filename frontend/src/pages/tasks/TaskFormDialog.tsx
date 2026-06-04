import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/select';
import { FormSection, Field } from '@/components/shared/FormSection';
import { tasksApi } from '@/api/tasks';
import { usersApi } from '@/api/users';
import { meetingsApi } from '@/api/meetings';

const schema = z.object({
  title: z.string().min(1, 'required').max(500),
  description: z.string().max(2000).optional(),
  assignedUserId: z.string().optional(),
  meetingId: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  taskId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskFormDialog({ open, mode, taskId, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getOne(taskId!).then((r) => r.data.data),
    enabled: isEdit && !!taskId && open,
  });

  const { data: users } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: () => usersApi.list().then((r) => r.data.data),
    staleTime: 60000,
  });

  const { data: meetingsRes } = useQuery({
    queryKey: ['meetings-dropdown'],
    queryFn: () => meetingsApi.list({ page: 1, pageSize: 200, sortBy: 'meetingDate', sortOrder: 'desc' }).then((r) => r.data),
    staleTime: 60000,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        title: existing.title ?? '',
        description: existing.description ?? '',
        assignedUserId: existing.assignedUserId ?? '',
        meetingId: existing.meetingId ?? '',
        status: existing.status ?? 'TODO',
        priority: existing.priority ?? 'MEDIUM',
        dueDate: existing.dueDate ? existing.dueDate.slice(0, 10) : '',
      });
    } else if (!isEdit) {
      reset({ title: '', description: '', assignedUserId: '', meetingId: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        assignedUserId: data.assignedUserId || undefined,
        meetingId: data.meetingId || undefined,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
      };
      if (isEdit && taskId) return tasksApi.update(taskId, payload);
      return tasksApi.create(payload);
    },
    onSuccess: onSaved,
  });

  const userOptions = [
    { value: '', label: '—' },
    ...(users ?? []).map((u) => ({ value: u.id, label: u.name })),
  ];

  const meetingOptions = [
    { value: '', label: '—' },
    ...(meetingsRes?.data ?? []).map((m) => ({
      value: m.id,
      label: `${new Date(m.meetingDate).toLocaleDateString('tr-TR')} — ${m.title}`,
    })),
  ];

  const statusOptions = [
    { value: 'TODO', label: t('tasks.status.TODO') },
    { value: 'IN_PROGRESS', label: t('tasks.status.IN_PROGRESS') },
    { value: 'DONE', label: t('tasks.status.DONE') },
    { value: 'CANCELLED', label: t('tasks.status.CANCELLED') },
  ];

  const priorityOptions = [
    { value: 'LOW', label: t('tasks.priority.LOW') },
    { value: 'MEDIUM', label: t('tasks.priority.MEDIUM') },
    { value: 'HIGH', label: t('tasks.priority.HIGH') },
    { value: 'URGENT', label: t('tasks.priority.URGENT') },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('tasks.editTitle') : t('tasks.addTitle')}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit((d) => saveMutation.mutate(d))}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        <FormSection title={t('tasks.sections.basic')}>
          <Field label={t('tasks.fields.title')} required error={errors.title?.message} fullWidth>
            <Input
              {...register('title')}
              placeholder="Görev başlığı..."
              className={errors.title ? 'border-red-400' : ''}
            />
          </Field>

          <Field label={t('tasks.fields.description')} fullWidth>
            <Textarea {...register('description')} rows={3} placeholder="Açıklama..." />
          </Field>

          <Field label={t('tasks.fields.status')}>
            <NativeSelect {...register('status')} options={statusOptions} />
          </Field>

          <Field label={t('tasks.fields.priority')}>
            <NativeSelect {...register('priority')} options={priorityOptions} />
          </Field>

          <Field label={t('tasks.fields.assignedUser')}>
            <NativeSelect {...register('assignedUserId')} options={userOptions} />
          </Field>

          <Field label={t('tasks.fields.meeting')}>
            <NativeSelect {...register('meetingId')} options={meetingOptions} />
          </Field>

          <Field label={t('tasks.fields.dueDate')}>
            <Input {...register('dueDate')} type="date" />
          </Field>
        </FormSection>

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {t('common.error')}
          </div>
        )}
      </form>
    </Modal>
  );
}
