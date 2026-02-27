import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { productsApi } from '@/api/products';
import { useAuthStore } from '@/store/auth.store';
import type { Product } from '@/types';
import ProductFormDialog from './ProductFormDialog';

function fmt(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductsTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN';

  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
  });

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['products'] });
    setDialog(null);
    setSelected(null);
  }

  const products = data ?? [];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-5xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Ürünler / Envanter</h2>
            <p className="text-xs text-gray-400 mt-0.5">Teklif ve faturalarda kullanılacak ürün kataloğu</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setSelected(null); setDialog('add'); }}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ürün
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
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-20" />
                {isAdmin && <col className="w-20" />}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Kod</th>
                  <th className="text-left px-5 py-3 font-medium">Ad</th>
                  <th className="text-left px-5 py-3 font-medium">Birim</th>
                  <th className="text-right px-5 py-3 font-medium">EUR Fiyat</th>
                  <th className="text-right px-5 py-3 font-medium">USD Fiyat</th>
                  <th className="text-right px-5 py-3 font-medium">TRY Fiyat</th>
                  <th className="text-left px-5 py-3 font-medium">Durum</th>
                  {isAdmin && <th className="px-5 py-3 text-right font-medium">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-mono text-gray-700">{p.code}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      {p.nameEn && <p className="text-xs text-gray-400">{p.nameEn}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{p.unit}</td>
                    <td className="px-5 py-3.5 text-sm text-right text-gray-700">{fmt(p.unitPriceEur)}</td>
                    <td className="px-5 py-3.5 text-sm text-right text-gray-700">{fmt(p.unitPriceUsd)}</td>
                    <td className="px-5 py-3.5 text-sm text-right text-gray-700">{fmt(p.unitPriceTry)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {p.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelected(p); setDialog('edit'); }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                            title={t('common.edit')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <ProductFormDialog
          open={!!dialog}
          mode={dialog}
          product={selected}
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
          <strong>{deleteTarget?.name}</strong> ürününü silmek istediğinize emin misiniz?
        </p>
      </Modal>
    </>
  );
}
