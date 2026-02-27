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
import { quotesApi } from '@/api/quotes';
import { customersApi } from '@/api/customers';
import { servicesApi } from '@/api/services';

const schema = z.object({
  customerId: z.string().min(1, 'required'),
  serviceId: z.string().optional(),
  quoteNumber: z.string().max(100).optional(),
  priceEur: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().optional()),
  priceUsd: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().optional()),
  priceTry: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().optional()),
  shipCount: z.coerce.number().int().min(1).optional(),
  quoteDate: z.string().min(1, 'required'),
  validUntil: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'REVISED', 'CANCELLED']),
  combinedInvoice: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  quoteId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuoteFormDialog({ open, mode, quoteId, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quotesApi.getOne(quoteId!).then((r) => r.data.data),
    enabled: isEdit && !!quoteId && open,
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
      status: 'DRAFT',
      shipCount: 1,
      quoteDate: new Date().toISOString().slice(0, 10),
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
        quoteNumber: existing.quoteNumber ?? '',
        priceEur: existing.priceEur ?? ('' as unknown as number),
        priceUsd: existing.priceUsd ?? ('' as unknown as number),
        priceTry: existing.priceTry ?? ('' as unknown as number),
        shipCount: existing.shipCount ?? 1,
        quoteDate: existing.quoteDate ? existing.quoteDate.slice(0, 10) : '',
        validUntil: existing.validUntil ? existing.validUntil.slice(0, 10) : '',
        status: existing.status ?? 'DRAFT',
        combinedInvoice: existing.combinedInvoice ?? false,
        notes: existing.notes ?? '',
      });
    } else if (!isEdit) {
      reset({
        status: 'DRAFT',
        shipCount: 1,
        quoteDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId,
        serviceId: data.serviceId || undefined,
        quoteNumber: data.quoteNumber || undefined,
        priceEur: data.priceEur != null ? Number(data.priceEur) : undefined,
        priceUsd: data.priceUsd != null ? Number(data.priceUsd) : undefined,
        priceTry: data.priceTry != null ? Number(data.priceTry) : undefined,
        shipCount: data.shipCount ?? 1,
        quoteDate: data.quoteDate,
        validUntil: data.validUntil || undefined,
        status: data.status,
        combinedInvoice: data.combinedInvoice ?? false,
        notes: data.notes || undefined,
      };
      if (isEdit && quoteId) return quotesApi.update(quoteId, payload);
      return quotesApi.create(payload);
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
      title={isEdit ? t('quotes.editTitle') : t('quotes.addTitle')}
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
        <FormSection title={t('quotes.sections.basic')}>
          <Field label={t('quotes.fields.customer')} required error={errors.customerId ? t('common.error') : undefined}>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => <NativeSelect {...field} options={customerOptions} />}
            />
          </Field>

          <Field label={t('quotes.fields.service')}>
            <Controller
              control={control}
              name="serviceId"
              render={({ field }) => (
                <NativeSelect {...field} options={serviceOptions} disabled={!watchedCustomerId} />
              )}
            />
          </Field>

          <Field label={t('quotes.fields.quoteNumber')}>
            <Input {...register('quoteNumber')} placeholder="00001-ODDYSHIP-01012025 (oto-oluşturulur)" />
          </Field>

          <Field label={t('quotes.fields.combinedInvoice')}>
            <div className="flex items-center gap-2 h-9">
              <Controller
                control={control}
                name="combinedInvoice"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="combinedInvoice"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                )}
              />
              <label htmlFor="combinedInvoice" className="text-sm text-gray-700 cursor-pointer select-none">
                {t('quotes.fields.combinedInvoice')}
              </label>
            </div>
          </Field>
        </FormSection>

        {/* Section 2: Pricing */}
        <FormSection title={t('quotes.sections.pricing')}>
          <Field label={t('quotes.fields.priceEur')}>
            <Input {...register('priceEur')} type="number" step="0.01" min="0" placeholder="0.00" />
          </Field>
          <Field label={t('quotes.fields.priceUsd')}>
            <Input {...register('priceUsd')} type="number" step="0.01" min="0" placeholder="0.00" />
          </Field>
          <Field label={t('quotes.fields.priceTry')}>
            <Input {...register('priceTry')} type="number" step="0.01" min="0" placeholder="0.00" />
          </Field>
          <Field label={t('quotes.fields.shipCount')}>
            <Input {...register('shipCount')} type="number" min="1" placeholder="1" />
          </Field>
        </FormSection>

        {/* Section 3: Dates & Status */}
        <FormSection title={t('quotes.sections.dates')}>
          <Field label={t('quotes.fields.quoteDate')} required error={errors.quoteDate ? t('common.error') : undefined}>
            <Input {...register('quoteDate')} type="date" />
          </Field>
          <Field label={t('quotes.fields.validUntil')}>
            <Input {...register('validUntil')} type="date" />
          </Field>
          <Field label={t('quotes.fields.status')} required>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'DRAFT', label: t('status.draft') },
                    { value: 'SENT', label: t('status.sent') },
                    { value: 'APPROVED', label: t('status.approved') },
                    { value: 'REJECTED', label: t('status.rejected') },
                    { value: 'REVISED', label: t('status.revised') },
                    { value: 'CANCELLED', label: t('status.cancelled') },
                  ]}
                />
              )}
            />
          </Field>
        </FormSection>

        {/* Section 4: Notes */}
        <FormSection title={t('quotes.sections.notes')}>
          <Field label={t('quotes.fields.notes')} fullWidth>
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
