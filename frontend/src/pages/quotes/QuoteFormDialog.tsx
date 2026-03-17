import { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/select';
import { FormSection, Field } from '@/components/shared/FormSection';
import { quotesApi } from '@/api/quotes';
import { customersApi } from '@/api/customers';
import { servicesApi } from '@/api/services';
import { productsApi } from '@/api/products';
import type { Product } from '@/types';

const itemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'required'),
  quantity: z.coerce.number().min(0.0001),
  unitPrice: z.coerce.number().min(0),
  currency: z.enum(['EUR', 'USD', 'TRY']),
  total: z.coerce.number(),
});

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
  items: z.array(itemSchema).optional(),
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

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'DRAFT',
      shipCount: 1,
      quoteDate: new Date().toISOString().slice(0, 10),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedCustomerId = watch('customerId');
  const watchedItems = watch('items') ?? [];
  const [filterServiceTypeId, setFilterServiceTypeId] = useState<string>('');

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => servicesApi.types().then((r) => r.data.data),
  });

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
      const existingItems = (existing as { items?: Array<{ productId?: string | null; description: string; quantity: number; unitPrice: number; currency: string; total: number }> }).items ?? [];
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
        items: existingItems.map((it) => ({
          productId: it.productId ?? '',
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          currency: it.currency as 'EUR' | 'USD' | 'TRY',
          total: it.total,
        })),
      });
    } else if (!isEdit) {
      reset({
        status: 'DRAFT',
        shipCount: 1,
        quoteDate: new Date().toISOString().slice(0, 10),
        items: [],
      });
    }
  }, [open, isEdit, existing, reset]);

  function handleProductSelect(index: number, productId: string, currency: 'EUR' | 'USD' | 'TRY') {
    const product = products.find((p: Product) => p.id === productId);
    if (!product) return;
    const price = currency === 'EUR' ? product.unitPriceEur : currency === 'USD' ? product.unitPriceUsd : product.unitPriceTry;
    setValue(`items.${index}.description`, product.name);
    if (price != null) {
      setValue(`items.${index}.unitPrice`, price);
      const qty = watchedItems[index]?.quantity ?? 1;
      setValue(`items.${index}.total`, qty * price);
    }
  }

  function recalcTotal(index: number) {
    const item = watchedItems[index];
    if (item) {
      setValue(`items.${index}.total`, (item.quantity ?? 0) * (item.unitPrice ?? 0));
    }
  }

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
        items: (data.items ?? []).map((it, i) => ({
          productId: it.productId || null,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          currency: it.currency,
          total: it.total,
          sortOrder: i,
        })),
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

  const filteredServices = filterServiceTypeId
    ? (services ?? []).filter((s) => String(s.serviceTypeId) === filterServiceTypeId)
    : (services ?? []);

  const serviceOptions = [
    { value: '', label: watchedCustomerId ? '—' : '(önce müşteri seçin)' },
    ...filteredServices.map((s) => {
      const stLabel = s.serviceType ? (lang === 'tr' ? s.serviceType.nameTr : s.serviceType.nameEn) : '';
      const shipLabel = s.ship?.name ?? '';
      const label = [stLabel, shipLabel].filter(Boolean).join(' — ') || s.id.slice(-6);
      return { value: s.id, label };
    }),
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
            <div className="flex flex-col gap-1">
              <select
                value={filterServiceTypeId}
                onChange={(e) => { setFilterServiceTypeId(e.target.value); setValue('serviceId', ''); }}
                disabled={!watchedCustomerId}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
              >
                <option value="">{t('common.all')} ({t('quotes.fields.service')})</option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={String(st.id)}>
                    {lang === 'tr' ? st.nameTr : st.nameEn}
                  </option>
                ))}
              </select>
              <Controller
                control={control}
                name="serviceId"
                render={({ field }) => (
                  <NativeSelect {...field} options={serviceOptions} disabled={!watchedCustomerId} />
                )}
              />
            </div>
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

        {/* Section 5: Items */}
        {(() => {
          // Tally by currency — computed live from qty*unitPrice
          const tally = (watchedItems ?? []).reduce<Record<string, number>>((acc, it) => {
            const cur = it.currency || 'USD';
            const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
            acc[cur] = (acc[cur] ?? 0) + lineTotal;
            return acc;
          }, {});
          const tallyCurrencies = Object.keys(tally);

          return (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Kalemler</h3>
            <button
              type="button"
              onClick={() => append({ productId: '', description: '', quantity: 1, unitPrice: 0, currency: 'USD', total: 0 })}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Satır Ekle
            </button>
          </div>
          {fields.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-36">Ürün</th>
                    <th className="text-left px-3 py-2 font-medium">Açıklama</th>
                    <th className="text-right px-3 py-2 font-medium w-20">Miktar</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Birim Fiyat</th>
                    <th className="text-left px-3 py-2 font-medium w-20">Para Bir.</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Toplam</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((field, index) => {
                    const curVal = (watchedItems[index]?.currency ?? 'USD') as 'EUR' | 'USD' | 'TRY';
                    return (
                      <tr key={field.id}>
                        <td className="px-2 py-1.5">
                          <select
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                            {...register(`items.${index}.productId`)}
                            onChange={(e) => {
                              const pid = e.target.value;
                              setValue(`items.${index}.productId`, pid);
                              if (pid) handleProductSelect(index, pid, curVal);
                            }}
                          >
                            <option value="">— serbest —</option>
                            {products.map((p: Product) => (
                              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            {...register(`items.${index}.description`)}
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                            placeholder="Açıklama"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            {...register(`items.${index}.quantity`)}
                            type="number" step="0.0001" min="0"
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-right"
                            onChange={(e) => {
                              setValue(`items.${index}.quantity`, Number(e.target.value));
                              recalcTotal(index);
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            {...register(`items.${index}.unitPrice`)}
                            type="number" step="0.01" min="0"
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-right"
                            onChange={(e) => {
                              setValue(`items.${index}.unitPrice`, Number(e.target.value));
                              recalcTotal(index);
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            {...register(`items.${index}.currency`)}
                            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                          >
                            <option>EUR</option>
                            <option>USD</option>
                            <option>TRY</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700 font-medium">
                          {((Number(watchedItems[index]?.quantity) || 0) * (Number(watchedItems[index]?.unitPrice) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-1 py-1.5">
                          <button type="button" onClick={() => remove(index)} className="text-gray-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {tallyCurrencies.length > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-3 py-1.5 text-xs text-gray-500 text-right font-medium">
                        Kalem Toplamı:
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold text-gray-800 text-xs">
                        {tallyCurrencies.map((cur) => (
                          <div key={cur}>{tally[cur].toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {cur}</div>
                        ))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
          );
        })()}

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </div>
        )}
      </form>
    </Modal>
  );
}
