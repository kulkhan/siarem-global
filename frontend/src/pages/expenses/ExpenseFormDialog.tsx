import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { expensesApi, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_TR } from '@/api/expenses';
import { customersApi } from '@/api/customers';
import { shipsApi } from '@/api/ships';
import { servicesApi } from '@/api/services';

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().optional(),
  description: z.string().min(1, 'required').max(500),
  amount: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().positive()),
  currency: z.enum(['TRY', 'EUR', 'USD']),
  date: z.string().min(1, 'required'),
  customerId: z.string().optional(),
  shipId: z.string().optional(),
  serviceId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  expenseId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ExpenseFormDialog({ open, mode, expenseId, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.getOne(expenseId!).then((r) => r.data.data),
    enabled: isEdit && !!expenseId && open,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-mini'],
    queryFn: () => customersApi.list({ pageSize: 500, sortBy: 'name', sortOrder: 'asc' }).then((r) => r.data.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'EXPENSE',
      currency: 'TRY',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const watchedCustomerId = watch('customerId');

  const { data: ships } = useQuery({
    queryKey: ['ships-mini', watchedCustomerId],
    queryFn: () =>
      shipsApi.list({ customerId: watchedCustomerId, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
        .then((r) => r.data.data),
    enabled: !!watchedCustomerId,
  });

  const { data: services } = useQuery({
    queryKey: ['services-mini', watchedCustomerId],
    queryFn: () =>
      servicesApi.list({ customerId: watchedCustomerId, pageSize: 200, sortBy: 'createdAt', sortOrder: 'desc' })
        .then((r) => r.data.data),
    enabled: !!watchedCustomerId,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        type: existing.type,
        category: existing.category ?? '',
        description: existing.description,
        amount: existing.amount,
        currency: (existing.currency as 'TRY' | 'EUR' | 'USD') ?? 'TRY',
        date: existing.date.slice(0, 10),
        customerId: existing.customerId ?? '',
        shipId: existing.shipId ?? '',
        serviceId: existing.serviceId ?? '',
        notes: existing.notes ?? '',
      });
    } else if (!isEdit) {
      reset({
        type: 'EXPENSE',
        currency: 'TRY',
        date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        type: data.type,
        category: data.category || undefined,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        customerId: data.customerId || undefined,
        shipId: data.shipId || undefined,
        serviceId: data.serviceId || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && expenseId) return expensesApi.update(expenseId, payload);
      return expensesApi.create(payload);
    },
    onSuccess: onSaved,
  });

  const customerOptions = [
    { value: '', label: '—' },
    ...(customers?.map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })) ?? []),
  ];

  const shipOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri)' },
    ...(ships?.map((s) => ({ value: s.id, label: s.name })) ?? []),
  ];

  const serviceOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri)' },
    ...(services?.map((s) => {
      const stLabel = s.serviceType ? (lang === 'tr' ? s.serviceType.nameTr : s.serviceType.nameEn) : '';
      const shipLabel = s.ship?.name ?? '';
      return { value: s.id, label: [stLabel, shipLabel].filter(Boolean).join(' — ') || s.id.slice(-6) };
    }) ?? []),
  ];

  const categoryOptions = [
    { value: '', label: '—' },
    ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: lang === 'tr' ? (EXPENSE_CATEGORY_TR[c] ?? c) : c })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('expenses.editTitle') : t('expenses.addTitle')}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit((d) => saveMutation.mutate(d))} disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        {/* Section 1: Type + Amount */}
        <FormSection title={t('expenses.sections.basic')}>
          <Field label={t('expenses.fields.type')} required>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'EXPENSE', label: t('expenses.type.EXPENSE') },
                    { value: 'INCOME', label: t('expenses.type.INCOME') },
                  ]}
                />
              )}
            />
          </Field>

          <Field label={t('expenses.fields.category')}>
            <Controller
              control={control}
              name="category"
              render={({ field }) => <NativeSelect {...field} options={categoryOptions} />}
            />
          </Field>

          <Field label={t('expenses.fields.description')} required error={errors.description ? t('common.error') : undefined}>
            <Input {...register('description')} placeholder="Açıklama..." />
          </Field>

          <Field label={t('expenses.fields.date')} required error={errors.date ? t('common.error') : undefined}>
            <Input {...register('date')} type="date" />
          </Field>

          <Field label={t('expenses.fields.amount')} required error={errors.amount ? t('common.error') : undefined}>
            <Input {...register('amount')} type="number" step="0.01" min="0" placeholder="0.00" />
          </Field>

          <Field label={t('expenses.fields.currency')} required>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'TRY', label: 'TRY ₺' },
                    { value: 'EUR', label: 'EUR €' },
                    { value: 'USD', label: 'USD $' },
                  ]}
                />
              )}
            />
          </Field>
        </FormSection>

        {/* Section 2: Links */}
        <FormSection title={t('expenses.sections.links')}>
          <Field label={t('expenses.fields.customer')}>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => <NativeSelect {...field} options={customerOptions} />}
            />
          </Field>
          <Field label={t('expenses.fields.ship')}>
            <Controller
              control={control}
              name="shipId"
              render={({ field }) => (
                <NativeSelect {...field} options={shipOptions} disabled={!watchedCustomerId} />
              )}
            />
          </Field>
          <Field label={t('expenses.fields.service')}>
            <Controller
              control={control}
              name="serviceId"
              render={({ field }) => (
                <NativeSelect {...field} options={serviceOptions} disabled={!watchedCustomerId} />
              )}
            />
          </Field>
        </FormSection>

        {/* Section 3: Notes */}
        <FormSection title={t('expenses.sections.notes')}>
          <Field label={t('expenses.fields.notes')} fullWidth>
            <Textarea {...register('notes')} rows={2} placeholder="Not..." />
          </Field>
        </FormSection>

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </div>
        )}
      </form>
    </Modal>
  );
}
