import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { FormSection, Field } from '@/components/shared/FormSection';
import { usersApi } from '@/api/users';
import type { User } from '@/types';

const createSchema = z.object({
  name: z.string().min(1, 'required').max(100),
  email: z.string().email('invalid').max(200),
  password: z.string().min(6, 'min 6 char'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
  isActive: z.boolean(),
});

const editSchema = z.object({
  name: z.string().min(1, 'required').max(100),
  email: z.string().email('invalid').max(200),
  password: z.string().max(100).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
  isActive: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type FormData = CreateForm | EditForm;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  user: User | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

export default function UserFormDialog({ open, mode, user, isSelf, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema) as never,
    defaultValues: { name: '', email: '', password: '', role: 'USER', isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && user) {
      reset({ name: user.name, email: user.email, password: '', role: user.role, isActive: user.isActive });
    } else {
      reset({ name: '', email: '', password: '', role: 'USER', isActive: true });
    }
  }, [open, isEdit, user, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit && user) {
        const payload: Record<string, unknown> = { name: data.name, email: data.email, role: data.role, isActive: data.isActive };
        if (data.password) payload.password = data.password;
        return usersApi.update(user.id, payload as never);
      }
      return usersApi.create(data as CreateForm);
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('settings.users.editTitle') : t('settings.users.addTitle')}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit((d) => saveMutation.mutate(d))} disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        <FormSection title={t('settings.users.info')}>
          <Field label={t('settings.users.fields.name')} required error={errors.name ? t('common.error') : undefined}>
            <Input {...register('name')} placeholder="Ad Soyad" />
          </Field>
          <Field label={t('settings.users.fields.email')} required error={errors.email ? t('common.error') : undefined}>
            <Input {...register('email')} type="email" placeholder="email@oddyship.com" />
          </Field>
          <Field
            label={isEdit ? t('settings.users.fields.newPassword') : t('settings.users.fields.password')}
            required={!isEdit}
            error={errors.password ? t('common.error') : undefined}
          >
            <Input {...register('password')} type="password" placeholder={isEdit ? t('settings.users.fields.passwordHint') : '••••••'} />
          </Field>
        </FormSection>

        <FormSection title={t('settings.users.permissions')}>
          <Field label={t('settings.users.fields.role')} required>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <NativeSelect {...field} options={ROLE_OPTIONS} disabled={isSelf} />
              )}
            />
          </Field>
          <Field label={t('settings.users.fields.isActive')}>
            <div className="flex items-center gap-2 h-9">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                disabled={isSelf}
                className="w-4 h-4 rounded border-gray-300 text-primary"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">{t('settings.users.fields.activeLabel')}</label>
            </div>
          </Field>
        </FormSection>

        {isSelf && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-1">
            {t('settings.users.selfNote')}
          </p>
        )}

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </div>
        )}
      </form>
    </Modal>
  );
}
