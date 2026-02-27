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
import { customersApi } from '@/api/customers';
import { shipsApi } from '@/api/ships';

// Common countries for shipping industry
const COUNTRIES = [
  'Türkiye', 'Greece', 'Cyprus', 'Malta', 'Norway', 'Denmark', 'Germany',
  'Netherlands', 'United Kingdom', 'Singapore', 'Hong Kong', 'Japan',
  'South Korea', 'China', 'Italy', 'Switzerland', 'United States', 'Panama',
  'Liberia', 'Marshall Islands', 'Bahamas',
].sort();

const schema = z.object({
  shortCode: z.string().min(1, 'required').max(30),
  name: z.string().min(1, 'required').max(200),
  email: z.union([z.string().email('invalid'), z.literal('')]).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  taxNumber: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  customerId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomerFormDialog({ open, mode, customerId, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.getOne(customerId!).then((r) => r.data.data),
    enabled: isEdit && !!customerId && open,
  });

  const { data: shipsData } = useQuery({
    queryKey: ['customer-ships', customerId],
    queryFn: () =>
      shipsApi.list({ customerId: customerId!, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
        .then((r) => r.data.data),
    enabled: isEdit && !!customerId && open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Populate form on edit
  useEffect(() => {
    if (open) {
      if (isEdit && existing) {
        reset({
          shortCode: existing.shortCode ?? '',
          name: existing.name ?? '',
          email: existing.email ?? '',
          phone: existing.phone ?? '',
          address: existing.address ?? '',
          country: existing.country ?? '',
          taxNumber: existing.taxNumber ?? '',
          notes: existing.notes ?? '',
        });
      } else if (!isEdit) {
        reset({
          shortCode: '', name: '', email: '', phone: '',
          address: '', country: '', taxNumber: '', notes: '',
        });
      }
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const clean = {
        ...data,
        shortCode: data.shortCode.toUpperCase().trim(),
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        country: data.country || undefined,
        taxNumber: data.taxNumber || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && customerId) return customersApi.update(customerId, clean);
      return customersApi.create(clean);
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('Short code')) {
        setError('shortCode', { message: t('common.error') });
      }
    },
  });

  const countryOptions = [
    { value: '', label: '—' },
    ...COUNTRIES.map((c) => ({ value: c, label: c })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('customers.editTitle') : t('customers.addTitle')}
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
        {/* Section 1: Basic */}
        <FormSection title={t('customers.sections.basic')}>
          <Field
            label={t('customers.fields.shortCode')}
            required
            error={errors.shortCode ? t('common.error') : undefined}
          >
            <Input
              {...register('shortCode')}
              placeholder="ADTOR"
              disabled={isEdit}
              className={cn(isEdit && 'bg-gray-50 cursor-not-allowed', errors.shortCode && 'border-red-400')}
            />
            <p className="text-xs text-gray-400">{t('customers.fields.shortCodeHint')}</p>
          </Field>

          <Field label={t('customers.fields.name')} required error={errors.name?.message}>
            <Input
              {...register('name')}
              placeholder="Firma Adı"
              className={errors.name ? 'border-red-400' : ''}
            />
          </Field>

          <Field label={t('customers.fields.country')}>
            <NativeSelect
              {...register('country')}
              options={countryOptions}
              placeholder="—"
            />
          </Field>

          <Field label={t('customers.fields.taxNumber')}>
            <Input {...register('taxNumber')} placeholder="1234567890" />
          </Field>
        </FormSection>

        {/* Section 2: Contact & Address */}
        <FormSection title={t('customers.sections.contact')}>
          <Field label={t('customers.fields.phone')}>
            <Input {...register('phone')} placeholder="+90 212 000 00 00" />
          </Field>

          <Field label={t('customers.fields.email')} error={errors.email?.message}>
            <Input
              {...register('email')}
              type="email"
              placeholder="info@firma.com"
              className={errors.email ? 'border-red-400' : ''}
            />
          </Field>

          <Field label={t('customers.fields.address')} fullWidth>
            <Textarea
              {...register('address')}
              rows={2}
              placeholder="Adres..."
            />
          </Field>

          <Field label={t('customers.fields.notes')} fullWidth>
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder="Notlar..."
            />
          </Field>
        </FormSection>

        {/* Ships list (edit mode only) */}
        {isEdit && shipsData && shipsData.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {t('customers.sections.ships')} ({shipsData.length})
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">{t('ships.fields.name')}</th>
                    <th className="px-3 py-2 text-left">{t('ships.fields.shipType')}</th>
                    <th className="px-3 py-2 text-right">{t('ships.fields.dwt')}</th>
                    <th className="px-3 py-2 text-right">{t('ships.fields.grossTonnage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shipsData.map((ship, i) => (
                    <tr key={ship.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 font-medium text-gray-800">{ship.name}</td>
                      <td className="px-3 py-2 text-gray-600">{ship.shipType?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {ship.dwt ? ship.dwt.toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {ship.grossTonnage ? ship.grossTonnage.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show server error */}
        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </div>
        )}
      </form>
    </Modal>
  );
}

// small helper — cn needed locally
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
