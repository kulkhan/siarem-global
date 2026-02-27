import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { FormSection, Field } from '@/components/shared/FormSection';
import { productsApi } from '@/api/products';
import type { Product } from '@/types';

const UNIT_OPTIONS = [
  { value: 'ADET', label: 'Adet' },
  { value: 'KG', label: 'Kg' },
  { value: 'LT', label: 'Litre' },
  { value: 'M', label: 'Metre' },
  { value: 'M2', label: 'M²' },
  { value: 'PKT', label: 'Paket' },
  { value: 'KUTU', label: 'Kutu' },
  { value: 'TAKIM', label: 'Takım' },
];

const schema = z.object({
  code: z.string().min(1, 'required').max(50),
  name: z.string().min(1, 'required').max(200),
  nameEn: z.string().max(200).optional().or(z.literal('')),
  unit: z.string().min(1),
  unitPriceEur: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  unitPriceUsd: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  unitPriceTry: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable().optional()),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductFormDialog({ open, mode, product, onClose, onSaved }: Props) {
  const isEdit = mode === 'edit';

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', nameEn: '', unit: 'ADET', unitPriceEur: null, unitPriceUsd: null, unitPriceTry: null, description: '', isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && product) {
      reset({
        code: product.code,
        name: product.name,
        nameEn: product.nameEn ?? '',
        unit: product.unit,
        unitPriceEur: product.unitPriceEur,
        unitPriceUsd: product.unitPriceUsd,
        unitPriceTry: product.unitPriceTry,
        description: product.description ?? '',
        isActive: product.isActive,
      });
    } else {
      reset({ code: '', name: '', nameEn: '', unit: 'ADET', unitPriceEur: null, unitPriceUsd: null, unitPriceTry: null, description: '', isActive: true });
    }
  }, [open, isEdit, product, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        nameEn: data.nameEn || undefined,
        description: data.description || undefined,
        unitPriceEur: data.unitPriceEur ?? undefined,
        unitPriceUsd: data.unitPriceUsd ?? undefined,
        unitPriceTry: data.unitPriceTry ?? undefined,
      };
      if (isEdit && product) return productsApi.update(product.id, payload);
      return productsApi.create(payload);
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Ürün Düzenle' : 'Yeni Ürün'}
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
        <FormSection title="Ürün Bilgileri">
          <Field label="Kod" required error={errors.code ? 'Zorunlu' : undefined}>
            <Input {...register('code')} placeholder="ör. YAĞLAMA-001" className="font-mono" />
          </Field>
          <Field label="Birim" required>
            <Controller
              control={control}
              name="unit"
              render={({ field }) => <NativeSelect {...field} options={UNIT_OPTIONS} />}
            />
          </Field>
          <Field label="Türkçe Ad" required fullWidth error={errors.name ? 'Zorunlu' : undefined}>
            <Input {...register('name')} placeholder="Ürün adı" />
          </Field>
          <Field label="İngilizce Ad" fullWidth>
            <Input {...register('nameEn')} placeholder="Product name" />
          </Field>
        </FormSection>

        <FormSection title="Fiyatlar">
          <Field label="EUR Birim Fiyat">
            <Input {...register('unitPriceEur')} type="number" step="0.01" placeholder="0.00" />
          </Field>
          <Field label="USD Birim Fiyat">
            <Input {...register('unitPriceUsd')} type="number" step="0.01" placeholder="0.00" />
          </Field>
          <Field label="TRY Birim Fiyat">
            <Input {...register('unitPriceTry')} type="number" step="0.01" placeholder="0.00" />
          </Field>
        </FormSection>

        <FormSection title="Diğer">
          <Field label="Açıklama" fullWidth>
            <Input {...register('description')} placeholder="Kısa açıklama" />
          </Field>
          <Field label="Aktif">
            <div className="flex items-center gap-2 h-9">
              <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-primary" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Ürün aktif</label>
            </div>
          </Field>
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
