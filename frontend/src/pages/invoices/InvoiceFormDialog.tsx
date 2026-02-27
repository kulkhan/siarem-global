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
import { invoicesApi } from '@/api/invoices';
import { customersApi } from '@/api/customers';
import { servicesApi } from '@/api/services';

const schema = z.object({
  customerId: z.string().min(1, 'required'),
  serviceId: z.string().optional(),
  refNo: z.string().max(100).optional(),
  amount: z.coerce.number().min(0),
  currency: z.enum(['EUR', 'USD', 'TRY']),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']),
  isCombined: z.boolean().optional(),
  invoiceDate: z.string().min(1, 'required'),
  dueDate: z.string().optional(),
  sentAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  invoiceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function InvoiceFormDialog({ open, mode, invoiceId, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.getOne(invoiceId!).then((r) => r.data.data),
    enabled: isEdit && !!invoiceId && open,
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
      currency: 'EUR',
      status: 'DRAFT',
      invoiceDate: new Date().toISOString().slice(0, 10),
    },
  });

  const watchedCustomerId = watch('customerId');

  const { data: services } = useQuery({
    queryKey: ['services-mini', watchedCustomerId],
    queryFn: () =>
      servicesApi.list({ customerId: watchedCustomerId, pageSize: 500, sortBy: 'createdAt', sortOrder: 'desc' })
        .then((r) => r.data.data),
    enabled: !!watchedCustomerId,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        customerId: existing.customerId ?? '',
        serviceId: existing.serviceId ?? '',
        refNo: existing.refNo ?? '',
        amount: existing.amount ?? 0,
        currency: (existing.currency as 'EUR' | 'USD' | 'TRY') ?? 'EUR',
        status: existing.status ?? 'DRAFT',
        isCombined: existing.isCombined ?? false,
        invoiceDate: existing.invoiceDate ? existing.invoiceDate.slice(0, 10) : '',
        dueDate: existing.dueDate ? existing.dueDate.slice(0, 10) : '',
        sentAt: existing.sentAt ? existing.sentAt.slice(0, 10) : '',
        notes: existing.notes ?? '',
      });
    } else if (!isEdit) {
      reset({
        currency: 'EUR',
        status: 'DRAFT',
        invoiceDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId,
        serviceId: data.serviceId || undefined,
        refNo: data.refNo || undefined,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        isCombined: data.isCombined ?? false,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate || undefined,
        sentAt: data.sentAt || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && invoiceId) return invoicesApi.update(invoiceId, payload);
      return invoicesApi.create(payload);
    },
    onSuccess: onSaved,
  });

  const customerOptions = [
    { value: '', label: '—' },
    ...(customers?.map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })) ?? []),
  ];

  const serviceOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri seçin)' },
    ...(services?.map((s) => {
      const stLabel = s.serviceType ? (lang === 'tr' ? s.serviceType.nameTr : s.serviceType.nameEn) : '';
      const shipLabel = s.ship?.name ?? '';
      const label = [stLabel, shipLabel].filter(Boolean).join(' — ') || s.id.slice(-6);
      return { value: s.id, label };
    }) ?? []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('invoices.editTitle') : t('invoices.addTitle')}
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
        {/* Section 1: Basic */}
        <FormSection title={t('invoices.sections.basic')}>
          <Field label={t('invoices.fields.customer')} required error={errors.customerId ? t('common.error') : undefined}>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => <NativeSelect {...field} options={customerOptions} />}
            />
          </Field>

          <Field label={t('invoices.fields.service')}>
            <Controller
              control={control}
              name="serviceId"
              render={({ field }) => (
                <NativeSelect {...field} options={serviceOptions} disabled={!watchedCustomerId} />
              )}
            />
          </Field>

          <Field label={t('invoices.fields.refNo')}>
            <Input {...register('refNo')} placeholder="ODA2025XXXXXXXXX" />
          </Field>

          <Field label={t('invoices.fields.isCombined')}>
            <div className="flex items-center gap-2 h-9">
              <Controller
                control={control}
                name="isCombined"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="isCombined"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                )}
              />
              <label htmlFor="isCombined" className="text-sm text-gray-700 cursor-pointer select-none">
                {t('invoices.fields.isCombined')}
              </label>
            </div>
          </Field>
        </FormSection>

        {/* Section 2: Amount & Status */}
        <FormSection title={t('invoices.sections.amount')}>
          <Field label={t('invoices.fields.amount')} required error={errors.amount ? t('common.error') : undefined}>
            <Input {...register('amount')} type="number" step="0.01" min="0" placeholder="0.00" />
          </Field>

          <Field label={t('invoices.fields.currency')} required>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'EUR', label: 'EUR — Euro' },
                    { value: 'USD', label: 'USD — US Dollar' },
                    { value: 'TRY', label: 'TRY — Türk Lirası' },
                  ]}
                />
              )}
            />
          </Field>

          <Field label={t('invoices.fields.status')} required>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'DRAFT', label: t('status.draft') },
                    { value: 'SENT', label: t('status.sent') },
                    { value: 'PARTIALLY_PAID', label: t('status.partiallyPaid') },
                    { value: 'PAID', label: t('status.paid') },
                    { value: 'OVERDUE', label: t('status.overdue') },
                    { value: 'CANCELLED', label: t('status.cancelled') },
                  ]}
                />
              )}
            />
          </Field>
        </FormSection>

        {/* Section 3: Dates */}
        <FormSection title={t('invoices.sections.dates')}>
          <Field label={t('invoices.fields.invoiceDate')} required error={errors.invoiceDate ? t('common.error') : undefined}>
            <Input {...register('invoiceDate')} type="date" />
          </Field>

          <Field label={t('invoices.fields.dueDate')}>
            <Input {...register('dueDate')} type="date" />
          </Field>

          <Field label={t('invoices.fields.sentAt')}>
            <Input {...register('sentAt')} type="date" />
          </Field>
        </FormSection>

        {/* Section 4: Notes */}
        <FormSection title={t('invoices.sections.notes')}>
          <Field label={t('invoices.fields.notes')} fullWidth>
            <Textarea {...register('notes')} rows={3} placeholder="Notlar..." />
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
