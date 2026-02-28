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
import { servicesApi } from '@/api/services';
import { customersApi } from '@/api/customers';
import { shipsApi } from '@/api/ships';
import { quotesApi } from '@/api/quotes';

const schema = z.object({
  customerId: z.string().min(1, 'required'),
  shipId: z.string().optional(),
  serviceTypeId: z.string().optional(),
  assignedUserId: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  startDate: z.string().optional(),
  completedAt: z.string().optional(),
  statusNote: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  euMrvMpStatus: z.string().max(200).optional(),
  ukMrvMpStatus: z.string().max(200).optional(),
  fuelEuMpStatus: z.string().max(200).optional(),
  imoDcsStatus: z.string().max(200).optional(),
  euEtsStatus: z.string().max(200).optional(),
  mohaStatus: z.string().max(200).optional(),
  quoteId: z.string().optional(),
  invoiceReady: z.boolean().optional(),
  invoiceReadyNote: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  serviceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ServiceFormDialog({ open, mode, serviceId, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const isEdit = mode === 'edit';
  const lang = i18n.language;

  // Fetch existing service on edit
  const { data: existing } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => servicesApi.getOne(serviceId!).then((r) => r.data.data),
    enabled: isEdit && !!serviceId && open,
  });

  // Dropdowns
  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => servicesApi.types().then((r) => r.data.data),
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
    defaultValues: { status: 'OPEN', priority: 'MEDIUM' },
  });

  const watchedCustomerId = watch('customerId');

  // Ships filtered by selected customer
  const { data: ships } = useQuery({
    queryKey: ['ships-mini', watchedCustomerId],
    queryFn: () =>
      shipsApi.list({ customerId: watchedCustomerId || undefined, pageSize: 500, sortBy: 'name', sortOrder: 'asc' })
        .then((r) => r.data.data),
    enabled: !!watchedCustomerId,
  });

  // Quotes filtered by selected customer
  const { data: quotes } = useQuery({
    queryKey: ['quotes-mini', watchedCustomerId],
    queryFn: () =>
      quotesApi.list({ customerId: watchedCustomerId, pageSize: 500, sortBy: 'quoteDate', sortOrder: 'desc' })
        .then((r) => r.data.data),
    enabled: !!watchedCustomerId,
  });

  // Populate form on edit
  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        customerId: existing.customerId ?? '',
        shipId: existing.shipId ?? '',
        serviceTypeId: existing.serviceTypeId ? String(existing.serviceTypeId) : '',
        assignedUserId: existing.assignedUserId ?? '',
        status: existing.status ?? 'OPEN',
        priority: existing.priority ?? 'MEDIUM',
        startDate: existing.startDate ? existing.startDate.slice(0, 10) : '',
        completedAt: existing.completedAt ? existing.completedAt.slice(0, 10) : '',
        statusNote: existing.statusNote ?? '',
        notes: existing.notes ?? '',
        quoteId: (existing as { quoteId?: string }).quoteId ?? '',
        invoiceReady: existing.invoiceReady ?? false,
        invoiceReadyNote: existing.invoiceReadyNote ?? '',
        euMrvMpStatus: existing.euMrvMpStatus ?? '',
        ukMrvMpStatus: existing.ukMrvMpStatus ?? '',
        fuelEuMpStatus: existing.fuelEuMpStatus ?? '',
        imoDcsStatus: existing.imoDcsStatus ?? '',
        euEtsStatus: existing.euEtsStatus ?? '',
        mohaStatus: existing.mohaStatus ?? '',
      });
    } else if (!isEdit) {
      reset({ status: 'OPEN', priority: 'MEDIUM' });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId,
        shipId: data.shipId || undefined,
        serviceTypeId: data.serviceTypeId ? Number(data.serviceTypeId) : undefined,
        assignedUserId: data.assignedUserId || undefined,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate || undefined,
        completedAt: data.completedAt || undefined,
        statusNote: data.statusNote || undefined,
        notes: data.notes || undefined,
        euMrvMpStatus: data.euMrvMpStatus || undefined,
        ukMrvMpStatus: data.ukMrvMpStatus || undefined,
        fuelEuMpStatus: data.fuelEuMpStatus || undefined,
        imoDcsStatus: data.imoDcsStatus || undefined,
        euEtsStatus: data.euEtsStatus || undefined,
        mohaStatus: data.mohaStatus || undefined,
        quoteId: data.quoteId || undefined,
        invoiceReady: data.invoiceReady ?? false,
        invoiceReadyNote: data.invoiceReadyNote || undefined,
      };
      if (isEdit && serviceId) return servicesApi.update(serviceId, payload);
      return servicesApi.create(payload);
    },
    onSuccess: onSaved,
  });

  const customerOptions = [
    { value: '', label: '—' },
    ...(customers?.map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })) ?? []),
  ];

  const shipOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri seçin)' },
    ...(ships?.map((s) => ({ value: s.id, label: s.name + (s.imoNumber ? ` — ${s.imoNumber}` : '') })) ?? []),
  ];

  const serviceTypeOptions = [
    { value: '', label: '—' },
    ...(serviceTypes?.map((st) => ({
      value: String(st.id),
      label: lang === 'tr' ? st.nameTr : st.nameEn,
    })) ?? []),
  ];

  const quoteOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri seçin)' },
    ...(quotes
      ?.filter((q) => {
        if (q.status === 'CANCELLED') return false;
        const alreadyInvoiced = (q._count as { invoices?: number } | undefined)?.invoices ?? 0;
        return alreadyInvoiced === 0;
      })
      .map((q) => {
        const date = q.quoteDate ? new Date(q.quoteDate).toLocaleDateString('tr-TR') : '';
        const desc = q.notes ? q.notes.slice(0, 40) : '';
        return {
          value: q.id,
          label: [q.quoteNumber, date, desc].filter(Boolean).join(' · '),
        };
      }) ?? []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('services.editTitle') : t('services.addTitle')}
      size="xl"
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
        {/* Section 1: Basic */}
        <FormSection title={t('services.sections.basic')}>
          <Field label={t('services.fields.customer')} required error={errors.customerId ? t('common.error') : undefined}>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={customerOptions}
                />
              )}
            />
          </Field>

          <Field label={t('services.fields.ship')}>
            <Controller
              control={control}
              name="shipId"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={shipOptions}
                  disabled={!watchedCustomerId}
                />
              )}
            />
          </Field>

          <Field label={t('services.fields.serviceType')}>
            <Controller
              control={control}
              name="serviceTypeId"
              render={({ field }) => (
                <NativeSelect {...field} options={serviceTypeOptions} />
              )}
            />
          </Field>

          <Field label={t('services.fields.assignedUser')}>
            <Input {...register('assignedUserId')} placeholder="Kullanıcı ID" />
          </Field>

          <Field label="Teklif (opsiyonel)">
            <Controller
              control={control}
              name="quoteId"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={quoteOptions}
                  disabled={!watchedCustomerId}
                />
              )}
            />
          </Field>
        </FormSection>

        {/* Section 2: Status & Priority */}
        <FormSection title={t('services.sections.statusDetails')}>
          <Field label={t('services.fields.status')} required>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'OPEN', label: t('status.open') },
                    { value: 'IN_PROGRESS', label: t('status.inProgress') },
                    { value: 'ON_HOLD', label: t('status.onHold') },
                    { value: 'COMPLETED', label: t('status.completed') },
                    { value: 'CANCELLED', label: t('status.cancelled') },
                  ]}
                />
              )}
            />
          </Field>

          <Field label={t('services.fields.priority')} required>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'LOW', label: t('services.priority.LOW') },
                    { value: 'MEDIUM', label: t('services.priority.MEDIUM') },
                    { value: 'HIGH', label: t('services.priority.HIGH') },
                    { value: 'URGENT', label: t('services.priority.URGENT') },
                  ]}
                />
              )}
            />
          </Field>

          <Field label={t('services.fields.startDate')}>
            <Input {...register('startDate')} type="date" />
          </Field>

          <Field label={t('services.fields.completedAt')}>
            <Input {...register('completedAt')} type="date" />
          </Field>

          <Field label={t('services.fields.statusNote')} fullWidth>
            <Input {...register('statusNote')} placeholder="Durum açıklaması..." />
          </Field>
        </FormSection>

        {/* Section 3: Billing */}
        <FormSection title={t('services.billing.title')}>
          <Field label={t('services.billing.ready')} fullWidth>
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="invoiceReady"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="invoiceReady"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                  />
                )}
              />
              <label htmlFor="invoiceReady" className="text-sm text-gray-700 cursor-pointer select-none">
                {t('services.billing.ready')}
              </label>
            </div>
          </Field>
          <Field label={t('services.billing.invoiceReadyNote')} fullWidth>
            <Input {...register('invoiceReadyNote')} placeholder="Fatura notu (opsiyonel)..." />
          </Field>
        </FormSection>

        {/* Section 4: Compliance */}
        <FormSection title={t('services.sections.compliance')}>
          <Field label={t('services.fields.euMrvMpStatus')}>
            <Input {...register('euMrvMpStatus')} placeholder="Hazırlandı / Onaylandı..." />
          </Field>
          <Field label={t('services.fields.ukMrvMpStatus')}>
            <Input {...register('ukMrvMpStatus')} placeholder="Hazırlandı / Onaylandı..." />
          </Field>
          <Field label={t('services.fields.fuelEuMpStatus')}>
            <Input {...register('fuelEuMpStatus')} placeholder="Hazırlandı / Onaylandı..." />
          </Field>
          <Field label={t('services.fields.imoDcsStatus')}>
            <Input {...register('imoDcsStatus')} placeholder="Hazırlandı / Onaylandı..." />
          </Field>
          <Field label={t('services.fields.euEtsStatus')}>
            <Input {...register('euEtsStatus')} placeholder="Hazırlandı / Onaylandı..." />
          </Field>
          <Field label={t('services.fields.mohaStatus')}>
            <Input {...register('mohaStatus')} placeholder="Hazırlandı / Onaylandı..." />
          </Field>
        </FormSection>

        {/* Section 5: Notes */}
        <FormSection title={t('services.sections.notes')}>
          <Field label={t('services.fields.notes')} fullWidth>
            <Textarea {...register('notes')} rows={4} placeholder="Genel notlar..." />
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
