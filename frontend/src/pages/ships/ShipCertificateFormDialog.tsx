import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { shipsApi, type ShipCertificate, type ShipCertificateInput } from '@/api/ships';

const CERT_TYPES = ['ISM', 'ISPS', 'MLC', 'IMO_DCS', 'EU_MRV', 'CLC', 'MARPOL', 'SOLAS', 'OTHER'];

interface Props {
  shipId: string;
  existing: ShipCertificate | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShipCertificateFormDialog({ shipId, existing, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = !!existing;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ShipCertificateInput>();

  useEffect(() => {
    if (existing) {
      reset({
        certType: existing.certType,
        certNo: existing.certNo ?? '',
        issueDate: existing.issueDate ? existing.issueDate.slice(0, 10) : '',
        expiryDate: existing.expiryDate.slice(0, 10),
        issuedBy: existing.issuedBy ?? '',
        notes: existing.notes ?? '',
      });
    } else {
      reset({ certType: 'ISM', certNo: '', issueDate: '', expiryDate: '', issuedBy: '', notes: '' });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: ShipCertificateInput) => {
      if (isEdit && existing) {
        return shipsApi.updateCertificate(shipId, existing.id, data);
      }
      return shipsApi.createCertificate(shipId, data);
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? t('shipCertificate.editCertificate') : t('shipCertificate.addCertificate')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shipCertificate.certType')} *
            </label>
            <select
              {...register('certType', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              {CERT_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {t(`shipCertificate.certTypes.${ct}`, ct)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shipCertificate.certNo')}
              </label>
              <input
                type="text"
                {...register('certNo')}
                placeholder="DOC-2024-001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shipCertificate.issuedBy')}
              </label>
              <input
                type="text"
                {...register('issuedBy')}
                placeholder="DNV, BV..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shipCertificate.issueDate')}
              </label>
              <input
                type="date"
                {...register('issueDate')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shipCertificate.expiryDate')} *
              </label>
              <input
                type="date"
                {...register('expiryDate', { required: true })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                  errors.expiryDate ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shipCertificate.notes')}
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
            />
          </div>

          {mutation.isError && (
            <p className="text-red-500 text-sm">{t('common.error')}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
