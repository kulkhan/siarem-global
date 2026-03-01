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
import { shipsApi } from '@/api/ships';
import { customersApi } from '@/api/customers';
import ShipCertificatesSection from './ShipCertificatesSection';

// Static options
const CLASSIFICATION_SOCIETIES = [
  'DNV', 'Bureau Veritas (BV)', "Lloyd's Register (LR)", 'ClassNK',
  'American Bureau of Shipping (ABS)', 'RINA', 'Korean Register (KR)',
  'China Classification Society (CCS)', 'Türk Loydu (TL)',
  'Indian Register (IRS)',
];
const EMISSION_VERIFIERS = [
  'Normec Verifavia', 'Bureau Veritas', "Lloyd's Register", 'DNV',
  'TÜV SÜD', 'SGS', 'Intertek',
];
const IT_SYSTEMS = [
  'GHG Genius', 'MRV DCS Voyage', 'DNV Navigator Port', 'BV Veritas.net',
  'Veson IMOS Platform', 'Nautilus Labs',
];
const FLAGS = [
  'Panama', 'Liberia', 'Marshall Islands', 'Bahamas', 'Malta', 'Cyprus',
  'Singapore', 'Hong Kong', 'Greece', 'Türkiye / Turkey', 'Norway',
  'Denmark', 'Vanuatu', 'Saint Kitts and Nevis', 'Saint Vincent',
  'Palau', 'Belize', 'Tuvalu',
].sort();

const schema = z.object({
  customerId: z.string().min(1, 'required'),
  name: z.string().min(1, 'required').max(200),
  imoNumber: z.string().max(20).optional().or(z.literal('')),
  shipTypeId: z.string().optional(),
  flag: z.string().max(100).optional(),
  grossTonnage: z.string().optional(),
  dwt: z.string().optional(),
  netTonnage: z.string().optional(),
  builtYear: z.string().optional(),
  classificationSociety: z.string().max(100).optional(),
  emissionVerifier: z.string().max(100).optional(),
  itSystem: z.string().max(100).optional(),
  adminAuthority: z.string().max(200).optional(),
  isLargeVessel: z.string().optional(),
  status: z.enum(['ACTIVE', 'PASSIVE', 'SOLD', 'SCRAPPED']),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  shipId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShipFormDialog({ open, mode, shipId, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const { data: existing } = useQuery({
    queryKey: ['ship', shipId],
    queryFn: () => shipsApi.getOne(shipId!).then((r) => r.data.data),
    enabled: isEdit && !!shipId && open,
  });

  const { data: shipTypes } = useQuery({
    queryKey: ['ship-types'],
    queryFn: () => shipsApi.types().then((r) => r.data.data),
    staleTime: Infinity,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: () => customersApi.list({ page: 1, pageSize: 500, sortBy: 'name' }).then((r) => r.data.data),
    staleTime: 60000,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      reset({
        customerId: existing.customerId ?? '',
        name: existing.name ?? '',
        imoNumber: existing.imoNumber ?? '',
        shipTypeId: existing.shipTypeId ? String(existing.shipTypeId) : '',
        flag: existing.flag ?? '',
        grossTonnage: existing.grossTonnage != null ? String(existing.grossTonnage) : '',
        dwt: existing.dwt != null ? String(existing.dwt) : '',
        netTonnage: existing.netTonnage != null ? String(existing.netTonnage) : '',
        builtYear: existing.builtYear != null ? String(existing.builtYear) : '',
        classificationSociety: existing.classificationSociety ?? '',
        emissionVerifier: existing.emissionVerifier ?? '',
        itSystem: existing.itSystem ?? '',
        adminAuthority: existing.adminAuthority ?? '',
        isLargeVessel: existing.isLargeVessel !== false ? 'true' : 'false',
        status: existing.status ?? 'ACTIVE',
        notes: existing.notes ?? '',
      });
    } else if (!isEdit) {
      reset({
        customerId: '', name: '', imoNumber: '', shipTypeId: '', flag: '',
        grossTonnage: '', dwt: '', netTonnage: '', builtYear: '',
        classificationSociety: '', emissionVerifier: '', itSystem: '',
        adminAuthority: '', isLargeVessel: 'true', status: 'ACTIVE', notes: '',
      });
    }
  }, [open, isEdit, existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        customerId: data.customerId,
        name: data.name,
        imoNumber: data.imoNumber || undefined,
        shipTypeId: data.shipTypeId ? parseInt(data.shipTypeId) : undefined,
        flag: data.flag || undefined,
        grossTonnage: data.grossTonnage ? parseFloat(data.grossTonnage) : undefined,
        dwt: data.dwt ? parseFloat(data.dwt) : undefined,
        netTonnage: data.netTonnage ? parseFloat(data.netTonnage) : undefined,
        builtYear: data.builtYear ? parseInt(data.builtYear) : undefined,
        classificationSociety: data.classificationSociety || undefined,
        emissionVerifier: data.emissionVerifier || undefined,
        itSystem: data.itSystem || undefined,
        adminAuthority: data.adminAuthority || undefined,
        isLargeVessel: data.isLargeVessel !== 'false',
        status: data.status,
        notes: data.notes || undefined,
      };
      if (isEdit && shipId) return shipsApi.update(shipId, payload);
      return shipsApi.create(payload);
    },
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('IMO')) setError('imoNumber', { message: msg });
    },
  });

  const shipTypeOptions = [
    { value: '', label: '—' },
    ...(shipTypes ?? []).map((st) => ({ value: String(st.id), label: st.name })),
  ];

  const customerOptions = [
    { value: '', label: '—' },
    ...(customers ?? []).map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })),
  ];

  const flagOptions = [
    { value: '', label: '—' },
    ...FLAGS.map((f) => ({ value: f, label: f })),
  ];

  const classOptions = [
    { value: '', label: '—' },
    ...CLASSIFICATION_SOCIETIES.map((v) => ({ value: v, label: v })),
  ];

  const verifierOptions = [
    { value: '', label: '—' },
    ...EMISSION_VERIFIERS.map((v) => ({ value: v, label: v })),
  ];

  const itOptions = [
    { value: '', label: '—' },
    ...IT_SYSTEMS.map((v) => ({ value: v, label: v })),
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: t('status.active') },
    { value: 'PASSIVE', label: t('status.passive') },
    { value: 'SOLD', label: t('status.sold') },
    { value: 'SCRAPPED', label: t('status.scrapped') },
  ];

  const largeOptions = [
    { value: 'true', label: t('common.yes') + ' (≥ 5000 GT)' },
    { value: 'false', label: t('common.no') + ' (< 5000 GT)' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('ships.editTitle') : t('ships.addTitle')}
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
        <FormSection title={t('ships.sections.basic')}>
          <Field label={t('ships.fields.customer')} required error={errors.customerId?.message}>
            <NativeSelect
              {...register('customerId')}
              options={customerOptions}
              placeholder="—"
              className={errors.customerId ? 'border-red-400' : ''}
            />
          </Field>

          <Field label={t('ships.fields.name')} required error={errors.name?.message}>
            <Input
              {...register('name')}
              placeholder="VESSEL NAME"
              className={errors.name ? 'border-red-400' : ''}
            />
          </Field>

          <Field label={t('ships.fields.imoNumber')} error={errors.imoNumber?.message}>
            <Input
              {...register('imoNumber')}
              placeholder="9123456"
              className={errors.imoNumber ? 'border-red-400' : ''}
            />
          </Field>

          <Field label={t('ships.fields.shipType')}>
            <NativeSelect {...register('shipTypeId')} options={shipTypeOptions} />
          </Field>
        </FormSection>

        {/* Section 2: Technical */}
        <FormSection title={t('ships.sections.technical')}>
          <Field label={t('ships.fields.flag')}>
            <NativeSelect {...register('flag')} options={flagOptions} />
          </Field>

          <Field label={t('ships.fields.builtYear')}>
            <Input
              {...register('builtYear')}
              type="number"
              placeholder="2005"
              min={1900}
              max={new Date().getFullYear() + 2}
            />
          </Field>

          <Field label={t('ships.fields.grossTonnage')}>
            <Input {...register('grossTonnage')} type="number" placeholder="25000" min={0} />
          </Field>

          <Field label={t('ships.fields.dwt')}>
            <Input {...register('dwt')} type="number" placeholder="45000" min={0} />
          </Field>

          <Field label={t('ships.fields.netTonnage')}>
            <Input {...register('netTonnage')} type="number" placeholder="12000" min={0} />
          </Field>

          <Field label={t('ships.fields.isLargeVessel')}>
            <NativeSelect {...register('isLargeVessel')} options={largeOptions} />
          </Field>
        </FormSection>

        {/* Section 3: Compliance */}
        <FormSection title={t('ships.sections.compliance')}>
          <Field label={t('ships.fields.classificationSociety')}>
            <NativeSelect {...register('classificationSociety')} options={classOptions} />
          </Field>

          <Field label={t('ships.fields.emissionVerifier')}>
            <NativeSelect {...register('emissionVerifier')} options={verifierOptions} />
          </Field>

          <Field label={t('ships.fields.itSystem')}>
            <NativeSelect {...register('itSystem')} options={itOptions} />
          </Field>

          <Field label={t('ships.fields.adminAuthority')}>
            <Input {...register('adminAuthority')} placeholder="Italy, Turkey..." />
          </Field>

          <Field label={t('ships.fields.status')}>
            <NativeSelect {...register('status')} options={statusOptions} />
          </Field>

          <Field label={t('ships.fields.notes')} fullWidth>
            <Textarea {...register('notes')} rows={2} placeholder="Notlar..." />
          </Field>
        </FormSection>

        {saveMutation.isError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
          </div>
        )}
      </form>

      {/* Certificates — only visible when editing an existing ship */}
      {isEdit && shipId && (
        <div className="px-1 pt-4 pb-2 border-t border-gray-100 dark:border-gray-700 mt-4">
          <ShipCertificatesSection shipId={shipId} />
        </div>
      )}
    </Modal>
  );
}
