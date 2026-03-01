import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Printer } from 'lucide-react';
import { serviceReportApi, type ServiceReportInput } from '@/api/serviceReport';
import { printServiceReport } from '@/utils/printServiceReport';

interface Props {
  serviceId: string;
  serviceName?: string;
  onClose: () => void;
}

export default function ServiceReportDialog({ serviceId, serviceName, onClose }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: reportRes } = useQuery({
    queryKey: ['service-report', serviceId],
    queryFn: () => serviceReportApi.get(serviceId),
  });

  const report = reportRes?.data.data;

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<ServiceReportInput>();

  useEffect(() => {
    if (report) {
      reset({
        workDone: report.workDone,
        findings: report.findings ?? '',
        partsUsed: report.partsUsed ?? '',
        reportDate: report.reportDate ? report.reportDate.slice(0, 10) : '',
        status: report.status,
      });
    } else {
      reset({
        workDone: '',
        findings: '',
        partsUsed: '',
        reportDate: new Date().toISOString().slice(0, 10),
        status: 'DRAFT',
      });
    }
  }, [report, reset]);

  const mutation = useMutation({
    mutationFn: (data: ServiceReportInput) => serviceReportApi.upsert(serviceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-report', serviceId] });
      onClose();
    },
  });

  const currentStatus = watch('status');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('serviceReport.title')}
            </h2>
            {serviceName && (
              <p className="text-xs text-gray-400 mt-0.5">{serviceName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={() => report && printServiceReport(report)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                {t('common.print')}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('serviceReport.workDone')} *
            </label>
            <textarea
              {...register('workDone', { required: true })}
              rows={4}
              placeholder={t('serviceReport.workDonePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('serviceReport.findings')}
            </label>
            <textarea
              {...register('findings')}
              rows={3}
              placeholder={t('serviceReport.findingsPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('serviceReport.partsUsed')}
            </label>
            <textarea
              {...register('partsUsed')}
              rows={2}
              placeholder={t('serviceReport.partsUsedPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('serviceReport.reportDate')}
              </label>
              <input
                type="date"
                {...register('reportDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('serviceReport.status')}
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="DRAFT">{t('serviceReport.statusDraft')}</option>
                <option value="FINALIZED">{t('serviceReport.statusFinalized')}</option>
              </select>
            </div>
          </div>

          {currentStatus === 'FINALIZED' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
              {t('serviceReport.finalizedWarning')}
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-500 text-sm">{t('common.error')}</p>
          )}

          <div className="flex gap-3 pt-2">
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
