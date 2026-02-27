import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/select';
import { FormSection, Field } from '@/components/shared/FormSection';
import { complaintsApi } from '@/api/complaints';
import { customersApi } from '@/api/customers';

const schema = z.object({
  customerId: z.string().optional(),
  type: z.enum(['COMPLAINT', 'FEEDBACK', 'SUGGESTION']),
  subject: z.string().min(1, 'Konu zorunludur'),
  description: z.string().min(1, 'Açıklama zorunludur'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Geçerli e-posta girin').optional().or(z.literal('')),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  responseNote: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  complaintId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ComplaintFormDialog({ open, mode, complaintId, onClose, onSaved }: Props) {
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['complaint', complaintId],
    queryFn: () => complaintsApi.getOne(complaintId!).then((r) => r.data.data),
    enabled: isEdit && !!complaintId && open,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-mini'],
    queryFn: () => customersApi.list({ pageSize: 500, sortBy: 'name', sortOrder: 'asc' }).then((r) => r.data.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'COMPLAINT',
      status: 'OPEN',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        customerId: existing.customerId ?? '',
        type: existing.type,
        subject: existing.subject,
        description: existing.description,
        contactName: existing.contactName ?? '',
        contactEmail: existing.contactEmail ?? '',
        status: existing.status,
        responseNote: existing.responseNote ?? '',
      });
    } else if (!isEdit) {
      reset({
        type: 'COMPLAINT',
        status: 'OPEN',
        subject: '',
        description: '',
        customerId: '',
        contactName: '',
        contactEmail: '',
        responseNote: '',
      });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId || undefined,
        type: data.type,
        subject: data.subject,
        description: data.description,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        ...(isEdit ? { status: data.status, responseNote: data.responseNote || undefined } : {}),
      };
      if (isEdit && complaintId) return complaintsApi.update(complaintId, payload);
      return complaintsApi.create(payload);
    },
    onSuccess: onSaved,
  });

  const customerOptions = [
    { value: '', label: '— (Müşteri yok)' },
    ...(customers?.map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })) ?? []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Şikayeti Düzenle' : 'Yeni Şikayet Ekle'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button onClick={handleSubmit((d) => saveMutation.mutate(d))} disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        {/* Section 1: Basic Info */}
        <FormSection title="Temel Bilgiler">
          <Field label="Müşteri">
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => <NativeSelect {...field} options={customerOptions} />}
            />
          </Field>

          <Field label="Tür" required>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <NativeSelect
                  {...field}
                  options={[
                    { value: 'COMPLAINT', label: 'Şikayet' },
                    { value: 'FEEDBACK', label: 'Geri Bildirim' },
                    { value: 'SUGGESTION', label: 'Öneri' },
                  ]}
                />
              )}
            />
          </Field>

          <Field label="Konu" required error={errors.subject?.message} fullWidth>
            <Input {...register('subject')} placeholder="Şikayet konusu" />
          </Field>

          <Field label="Açıklama" required error={errors.description?.message} fullWidth>
            <Textarea {...register('description')} rows={4} placeholder="Detaylı açıklama..." />
          </Field>
        </FormSection>

        {/* Section 2: Contact Info */}
        <FormSection title="İletişim Bilgileri (isteğe bağlı)">
          <Field label="Ad Soyad">
            <Input {...register('contactName')} placeholder="Gönderen adı" />
          </Field>

          <Field label="E-posta" error={errors.contactEmail?.message}>
            <Input {...register('contactEmail')} type="email" placeholder="ornek@email.com" />
          </Field>
        </FormSection>

        {/* Section 3: Response (edit mode only) */}
        {isEdit && (
          <FormSection title="Yanıt & Durum">
            <Field label="Durum" required>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <NativeSelect
                    {...field}
                    options={[
                      { value: 'OPEN', label: 'Açık' },
                      { value: 'IN_PROGRESS', label: 'İşlemde' },
                      { value: 'RESOLVED', label: 'Çözüldü' },
                      { value: 'CLOSED', label: 'Kapatıldı' },
                    ]}
                  />
                )}
              />
            </Field>

            <Field label="Yanıt Notu" fullWidth>
              <Textarea {...register('responseNote')} rows={3} placeholder="Müşteriye yanıt notu..." />
            </Field>
          </FormSection>
        )}

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Bir hata oluştu'}
          </div>
        )}
      </form>
    </Modal>
  );
}
