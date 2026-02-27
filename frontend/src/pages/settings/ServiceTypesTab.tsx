import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Globe, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { serviceTypesApi } from '@/api/serviceTypes';
import { useAuthStore } from '@/store/auth.store';
import type { ServiceType } from '@/types';
import ServiceTypeFormDialog from './ServiceTypeFormDialog';

export default function ServiceTypesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const isAdmin = me?.role === 'ADMIN' || isSuperAdmin;

  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ServiceType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceType | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => serviceTypesApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => serviceTypesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-types'] });
      setDeleteTarget(null);
    },
  });

  function openEdit(st: ServiceType) {
    setSelected(st);
    setDialog('edit');
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['service-types'] });
    setDialog(null);
    setSelected(null);
  }

  const types = data ?? [];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-5xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Servis Tipleri</h2>
            <p className="text-xs text-gray-400 mt-0.5">Global ve firmaya özel servis tipi tanımları</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setSelected(null); setDialog('add'); }}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Servis Tipi
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <colgroup>
                <col className="w-24" />
                <col className="w-48" />
                <col className="w-48" />
                <col className="w-32" />
                <col className="w-24" />
                {isAdmin && <col className="w-24" />}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Kod</th>
                  <th className="text-left px-5 py-3 font-medium">İngilizce Ad</th>
                  <th className="text-left px-5 py-3 font-medium">Türkçe Ad</th>
                  <th className="text-left px-5 py-3 font-medium">Kategori</th>
                  <th className="text-left px-5 py-3 font-medium">Tip</th>
                  {isAdmin && <th className="px-5 py-3 text-right font-medium">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {types.map((st) => {
                  const isGlobal = st.companyId === null;
                  const canEdit = isAdmin && (!isGlobal || isSuperAdmin);
                  return (
                    <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-700">{st.code}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-800">{st.nameEn}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{st.nameTr}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{st.category ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        {isGlobal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                            <Globe className="w-3 h-3" />
                            Global
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Building2 className="w-3 h-3" />
                            Özel
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(st)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                                title={t('common.edit')}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(st)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {types.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <ServiceTypeFormDialog
          open={!!dialog}
          mode={dialog}
          serviceType={selected}
          onClose={() => { setDialog(null); setSelected(null); }}
          onSaved={handleSaved}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <strong>{deleteTarget?.nameEn}</strong> servis tipini silmek istediğinize emin misiniz?
        </p>
      </Modal>
    </>
  );
}
