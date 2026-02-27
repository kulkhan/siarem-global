import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSection, Field } from '@/components/shared/FormSection';
import { serviceTypesApi } from '@/api/serviceTypes';
import { useAuthStore } from '@/store/auth.store';
import type { ServiceType } from '@/types';

const schema = z.object({
  nameEn: z.string().min(1, 'required').max(100),
  nameTr: z.string().min(1, 'required').max(100),
  code: z.string().min(1, 'required').max(20),
  category: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  isGlobal: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  serviceType: ServiceType | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ServiceTypeFormDialog({ open, mode, serviceType, onClose, onSaved }: Props) {
  const { user: me } = useAuthStore();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const isEdit = mode === 'edit';

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nameEn: '', nameTr: '', code: '', category: '', description: '', isGlobal: false },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && serviceType) {
      reset({
        nameEn: serviceType.nameEn,
        nameTr: serviceType.nameTr,
        code: serviceType.code,
        category: serviceType.category ?? '',
        description: serviceType.description ?? '',
        isGlobal: serviceType.companyId === null,
      });
    } else {
      reset({ nameEn: '', nameTr: '', code: '', category: '', description: '', isGlobal: false });
    }
  }, [open, isEdit, serviceType, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit && serviceType) {
        return serviceTypesApi.update(serviceType.id, {
          nameEn: data.nameEn,
          nameTr: data.nameTr,
          code: data.code,
          category: data.category || undefined,
          description: data.description || undefined,
        });
      }
      return serviceTypesApi.create({
        nameEn: data.nameEn,
        nameTr: data.nameTr,
        code: data.code,
        category: data.category || undefined,
        description: data.description || undefined,
        isGlobal: data.isGlobal,
      });
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Servis Tipi Düzenle' : 'Yeni Servis Tipi'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>İptal</Button>
          <Button onClick={handleSubmit((d) => saveMutation.mutate(d))} disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        <FormSection title="Bilgiler">
          <Field label="İngilizce Ad" required error={errors.nameEn ? 'Zorunlu alan' : undefined}>
            <Input {...register('nameEn')} placeholder="e.g. MRV Reporting" />
          </Field>
          <Field label="Türkçe Ad" required error={errors.nameTr ? 'Zorunlu alan' : undefined}>
            <Input {...register('nameTr')} placeholder="ör. MRV Raporlama" />
          </Field>
          <Field label="Kod" required error={errors.code ? 'Zorunlu alan' : undefined}>
            <Input {...register('code')} placeholder="ör. MRV_RPT" className="font-mono" />
          </Field>
          <Field label="Kategori">
            <Input {...register('category')} placeholder="ör. Compliance, Survey..." />
          </Field>
          <Field label="Açıklama" fullWidth>
            <Input {...register('description')} placeholder="Kısa açıklama" />
          </Field>
          {isSuperAdmin && !isEdit && (
            <Field label="Global tip" fullWidth>
              <div className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  id="isGlobal"
                  {...register('isGlobal')}
                  className="w-4 h-4 rounded border-gray-300 text-primary"
                />
                <label htmlFor="isGlobal" className="text-sm text-gray-700">
                  Tüm tenantlarda görünür (Global)
                </label>
              </div>
            </Field>
          )}
        </FormSection>

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Bir hata oluştu'}
          </div>
        )}
      </form>
    </Modal>
  );
}
