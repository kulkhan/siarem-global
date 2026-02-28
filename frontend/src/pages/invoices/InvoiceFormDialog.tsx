import { useEffect } from 'react';
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
import { invoicesApi } from '@/api/invoices';
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
  refNo: z.string().max(100).optional(),
  amount: z.coerce.number().min(0),
  currency: z.enum(['EUR', 'USD', 'TRY']),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']),
  isCombined: z.boolean().optional(),
  invoiceDate: z.string().min(1, 'required'),
  dueDate: z.string().optional(),
  sentAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(itemSchema).optional(),
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
      currency: 'EUR',
      status: 'DRAFT',
      invoiceDate: new Date().toISOString().slice(0, 10),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedCustomerId = watch('customerId');
  const watchedItems = watch('items') ?? [];

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
        refNo: existing.refNo ?? '',
        amount: existing.amount ?? 0,
        currency: (existing.currency as 'EUR' | 'USD' | 'TRY') ?? 'EUR',
        status: existing.status ?? 'DRAFT',
        isCombined: existing.isCombined ?? false,
        invoiceDate: existing.invoiceDate ? existing.invoiceDate.slice(0, 10) : '',
        dueDate: existing.dueDate ? existing.dueDate.slice(0, 10) : '',
        sentAt: existing.sentAt ? existing.sentAt.slice(0, 10) : '',
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
        currency: 'EUR',
        status: 'DRAFT',
        invoiceDate: new Date().toISOString().slice(0, 10),
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
      const newTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0);
      setValue(`items.${index}.total`, newTotal);
      // Auto-fill header amount if all items share a single currency
      setTimeout(() => syncAmountFromItems(), 0);
    }
  }

  function syncAmountFromItems() {
    const items = watchedItems ?? [];
    if (items.length === 0) return;
    const currencies = [...new Set(items.map((it) => it.currency).filter(Boolean))];
    if (currencies.length === 1) {
      const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
      setValue('amount', total);
      setValue('currency', currencies[0] as 'EUR' | 'USD' | 'TRY');
    }
  }

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

        {/* Section 5: Items */}
        {(() => {
          // Tally by currency — computed from qty*unitPrice for real-time update
          const tally = (watchedItems ?? []).reduce<Record<string, number>>((acc, it) => {
            const cur = it.currency || 'EUR';
            const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
            acc[cur] = (acc[cur] ?? 0) + lineTotal;
            return acc;
          }, {});
          const tallyCurrencies = Object.keys(tally);
          const singleCurrency = tallyCurrencies.length === 1 ? tallyCurrencies[0] : null;

          return (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Kalemler</h3>
                <button
                  type="button"
                  onClick={() => append({ productId: '', description: '', quantity: 1, unitPrice: 0, currency: 'EUR', total: 0 })}
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
                        const curVal = (watchedItems[index]?.currency ?? 'EUR') as 'EUR' | 'USD' | 'TRY';
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
                          <td className="px-1 py-1.5 text-center">
                            {singleCurrency && (
                              <button
                                type="button"
                                onClick={() => syncAmountFromItems()}
                                title="Tutara aktar"
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium leading-tight"
                              >
                                ↑ Aktar
                              </button>
                            )}
                          </td>
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
