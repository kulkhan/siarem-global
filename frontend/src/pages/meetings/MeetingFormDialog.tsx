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
import { meetingsApi } from '@/api/meetings';
import { customersApi } from '@/api/customers';
import { shipsApi } from '@/api/ships';

const schema = z.object({
  customerId: z.string().min(1, 'required'),
  shipId: z.string().optional(),
  meetingType: z.enum(['MEETING', 'CALL']),
  title: z.string().min(1, 'required').max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  duration: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(1).optional()),
  meetingDate: z.string().min(1, 'required'),
  followUpDate: z.string().optional(),
  attendees: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  meetingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function MeetingFormDialog({ open, mode, meetingId, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => meetingsApi.getOne(meetingId!).then((r) => r.data.data),
    enabled: isEdit && !!meetingId && open,
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
      meetingType: 'MEETING',
      meetingDate: new Date().toISOString().slice(0, 10),
    },
  });

  const watchedCustomerId = watch('customerId');
  const watchedType = watch('meetingType');

  const { data: ships } = useQuery({
    queryKey: ['ships-mini', watchedCustomerId],
    queryFn: () =>
      shipsApi.list({ customerId: watchedCustomerId, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
        .then((r) => r.data.data),
    enabled: !!watchedCustomerId,
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        customerId: existing.customerId ?? '',
        shipId: existing.shipId ?? '',
        meetingType: (existing.meetingType as 'MEETING' | 'CALL') ?? 'MEETING',
        title: existing.title ?? '',
        description: existing.description ?? '',
        location: existing.location ?? '',
        duration: existing.duration ?? ('' as unknown as number),
        meetingDate: existing.meetingDate ? existing.meetingDate.slice(0, 10) : '',
        followUpDate: existing.followUpDate ? existing.followUpDate.slice(0, 10) : '',
        attendees: existing.attendees ?? '',
        notes: existing.notes ?? '',
      });
    } else if (!isEdit) {
      reset({
        meetingType: 'MEETING',
        meetingDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId,
        shipId: data.shipId || undefined,
        meetingType: data.meetingType,
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        duration: data.duration || undefined,
        meetingDate: data.meetingDate,
        followUpDate: data.followUpDate || undefined,
        attendees: data.attendees || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && meetingId) return meetingsApi.update(meetingId, payload);
      return meetingsApi.create(payload);
    },
    onSuccess: onSaved,
  });

  const customerOptions = [
    { value: '', label: '—' },
    ...(customers?.map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })) ?? []),
  ];

  const shipOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri seçin)' },
    ...(ships?.map((s) => ({ value: s.id, label: s.name + (s.imoNumber ? ` (${s.imoNumber})` : '') })) ?? []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('meetings.editTitle') : t('meetings.addTitle')}
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
        <FormSection title={t('meetings.sections.basic')}>
          <Field label={t('meetings.fields.type')} required>
            <Controller
              control={control}
              name="meetingType"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'MEETING', label: t('meetings.type.MEETING') },
                    { value: 'CALL', label: t('meetings.type.CALL') },
                  ]}
                />
              )}
            />
          </Field>

          <Field label={t('meetings.fields.customer')} required error={errors.customerId ? t('common.error') : undefined}>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => <NativeSelect {...field} options={customerOptions} />}
            />
          </Field>

          <Field label={t('meetings.fields.ship')}>
            <Controller
              control={control}
              name="shipId"
              render={({ field }) => (
                <NativeSelect {...field} options={shipOptions} disabled={!watchedCustomerId} />
              )}
            />
          </Field>

          <Field label={t('meetings.fields.title')} required error={errors.title ? t('common.error') : undefined}>
            <Input {...register('title')} placeholder={watchedType === 'CALL' ? 'Telefon görüşmesi - Müşteri adı' : 'Toplantı konusu...'} />
          </Field>
        </FormSection>

        {/* Section 2: Date & Location */}
        <FormSection title={t('meetings.sections.dateLocation')}>
          <Field label={t('meetings.fields.date')} required error={errors.meetingDate ? t('common.error') : undefined}>
            <Input {...register('meetingDate')} type="date" />
          </Field>

          <Field label={t('meetings.fields.followUpDate')}>
            <Input {...register('followUpDate')} type="date" />
          </Field>

          {watchedType === 'MEETING' ? (
            <Field label={t('meetings.fields.location')}>
              <Input {...register('location')} placeholder="Ofis, Online, Şantiye..." />
            </Field>
          ) : (
            <Field label={t('meetings.fields.duration')}>
              <Input {...register('duration')} type="number" min="1" placeholder="Dakika" />
            </Field>
          )}
        </FormSection>

        {/* Section 3: Details */}
        <FormSection title={t('meetings.sections.details')}>
          <Field label={t('meetings.fields.description')} fullWidth>
            <Textarea {...register('description')} rows={3} placeholder="Görüşme detayları..." />
          </Field>

          {watchedType === 'MEETING' && (
            <Field label={t('meetings.fields.attendees')} fullWidth>
              <Input {...register('attendees')} placeholder="Ali Yılmaz, Fatma Kaya..." />
            </Field>
          )}

          <Field label={t('meetings.fields.notes')} fullWidth>
            <Textarea {...register('notes')} rows={2} placeholder="Aksiyon maddeleri, sonraki adımlar..." />
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
