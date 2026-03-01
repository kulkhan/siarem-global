import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { productsApi } from '@/api/products';
import { useAuthStore } from '@/store/auth.store';
import type { Product } from '@/types';
import ProductFormDialog from './ProductFormDialog';
import ProductTransactionsDrawer from './ProductTransactionsDrawer';

function fmt(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StockBadge({ stockQuantity, minStock, unit }: { stockQuantity: number | null; minStock: number | null; unit: string }) {
  const { t } = useTranslation();
  if (stockQuantity == null) {
    return <span className="text-xs text-gray-400">{t('products.stockUntracked')}</span>;
  }
  const isLow = minStock != null && stockQuantity <= minStock;
  const isEmpty = stockQuantity <= 0;
  const colorClass = isEmpty
    ? 'text-red-700 bg-red-50 border-red-200'
    : isLow
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-green-700 bg-green-50 border-green-200';
  const label = isEmpty ? t('products.stockEmpty') : isLow ? t('products.stockLow') : t('products.stockOk');

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isEmpty ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-green-500'}`} />
      {fmt(stockQuantity)} {unit} — {label}
    </span>
  );
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const isAdmin = me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN';

  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [txProduct, setTxProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setConfirmDeleteId(null);
    },
  });

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['products'] });
    setDialog(null);
    setSelected(null);
  }

  const products = data ?? [];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('products.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('products.subtitle')}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setSelected(null); setDialog('add'); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('products.newProduct')}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">{t('products.fields.code')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('products.fields.nameTr')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('products.fields.unit')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('products.stockStatus')}</th>
                  <th className="text-left px-5 py-3 font-medium">{t('products.minStock')}</th>
                  <th className="text-right px-5 py-3 font-medium">EUR</th>
                  <th className="text-right px-5 py-3 font-medium">USD</th>
                  <th className="text-right px-5 py-3 font-medium">TRY</th>
                  <th className="text-left px-5 py-3 font-medium">{t('common.status')}</th>
                  <th className="px-5 py-3 text-right font-medium">{t('common.actions')}</th>
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
                    <td className="px-5 py-3.5">
                      <StockBadge stockQuantity={p.stockQuantity} minStock={p.minStock} unit={p.unit} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {p.minStock != null ? `${fmt(p.minStock)} ${p.unit}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-gray-700">{fmt(p.unitPriceEur)}</td>
                    <td className="px-5 py-3.5 text-sm text-right text-gray-700">{fmt(p.unitPriceUsd)}</td>
                    <td className="px-5 py-3.5 text-sm text-right text-gray-700">{fmt(p.unitPriceTry)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {p.isActive ? t('common.active') : t('common.passive')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setTxProduct(p)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                          title={t('products.transactions.title')}
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => { setSelected(p); setDialog('edit'); }}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                              title={t('common.edit')}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === p.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500">{t('common.deleteConfirm')}</span>
                                <button
                                  onClick={() => deleteMutation.mutate(p.id)}
                                  className="text-[10px] text-red-600 font-semibold hover:underline"
                                >
                                  {t('common.yes')}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[10px] text-gray-500 font-semibold hover:underline"
                                >
                                  {t('common.no')}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(p.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Dialog */}
      {dialog && (
        <ProductFormDialog
          open={!!dialog}
          mode={dialog}
          product={selected}
          onClose={() => { setDialog(null); setSelected(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Stock Transactions Drawer */}
      {txProduct && (
        <ProductTransactionsDrawer
          product={txProduct}
          onClose={() => setTxProduct(null)}
        />
      )}
    </div>
  );
}
