import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { createCompany, updateCompany } from '@/api/companies';
import type { Company } from '@/types';
import type { CompanyInput } from '@/api/companies';

interface Props {
  open: boolean;
  company?: Company;
  onClose: () => void;
}

export default function CompanyFormDialog({ open, company, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!company;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyInput>();

  useEffect(() => {
    if (open) {
      reset(company ? {
        name: company.name,
        domain: company.domain,
        slug: company.slug,
        plan: company.plan ?? '',
        logoUrl: company.logoUrl ?? '',
        isActive: company.isActive,
      } : { isActive: true });
    }
  }, [open, company, reset]);

  const mutation = useMutation({
    mutationFn: (data: CompanyInput) =>
      isEdit ? updateCompany(company!.id, data) : createCompany(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Şirket Düzenle' : 'Yeni Şirket'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şirket Adı *</label>
            <input
              {...register('name', { required: 'Şirket adı zorunludur' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Denizcilik"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
            <input
              {...register('domain', { required: 'Domain zorunludur' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="acme.siarem.com"
            />
            {errors.domain && <p className="text-red-500 text-xs mt-1">{errors.domain.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              {...register('slug', { required: 'Slug zorunludur', pattern: { value: /^[a-z0-9-]+$/, message: 'Sadece küçük harf, rakam ve tire' } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="acme"
            />
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              {...register('plan')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seçiniz —</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Aktif</label>
          </div>

          {mutation.isError && (
            <p className="text-red-500 text-sm">
              {(mutation.error as Error)?.message || 'Bir hata oluştu'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
