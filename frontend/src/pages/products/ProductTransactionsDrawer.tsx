import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, ArrowDownCircle, ArrowUpCircle, RefreshCw, Plus } from 'lucide-react';
import { productTransactionsApi } from '@/api/productTransactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import type { Product, ProductTransactionType } from '@/types';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  IN: ArrowDownCircle,
  OUT: ArrowUpCircle,
  ADJUSTMENT: RefreshCw,
};

const TYPE_COLORS: Record<string, string> = {
  IN: 'text-green-600 bg-green-50',
  OUT: 'text-red-600 bg-red-50',
  ADJUSTMENT: 'text-blue-600 bg-blue-50',
};

interface Props {
  product: Product;
  onClose: () => void;
}

export default function ProductTransactionsDrawer({ product, onClose }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ProductTransactionType>('IN');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const { data: res, isLoading } = useQuery({
    queryKey: ['product-transactions', product.id],
    queryFn: () => productTransactionsApi.list(product.id),
  });

  const transactions = res?.data.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => productTransactionsApi.create(product.id, {
      type,
      quantity: type === 'OUT' ? -Math.abs(Number(quantity)) : Math.abs(Number(quantity)),
      notes: notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-transactions', product.id] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setQuantity('');
      setNotes('');
      setShowForm(false);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('products.transactions.title')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{product.name} — {product.code}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stock summary */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('products.stockQuantity')}</span>
            <span className={`font-semibold ${
              product.stockQuantity == null ? 'text-gray-400'
              : product.minStock != null && product.stockQuantity <= product.minStock
                ? 'text-red-600' : 'text-green-600'
            }`}>
              {product.stockQuantity != null ? `${product.stockQuantity} ${product.unit}` : t('products.stockUntracked')}
            </span>
          </div>
          {product.minStock != null && (
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>{t('products.minStock')}</span>
              <span>{product.minStock} {product.unit}</span>
            </div>
          )}
        </div>

        {/* Add transaction form */}
        {showForm ? (
          <div className="px-5 py-4 border-b border-gray-200 bg-amber-50 shrink-0">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('products.transactions.addManual')}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">{t('products.transactions.typeLabel')}</label>
                <NativeSelect
                  value={type}
                  onChange={(e) => setType(e.target.value as ProductTransactionType)}
                  options={[
                    { value: 'IN', label: t('products.transactions.typeIn') },
                    { value: 'ADJUSTMENT', label: t('products.transactions.typeAdjustment') },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">{t('products.transactions.quantity')}</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">{t('common.notes')}</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('common.optional')} />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={!quantity || Number(quantity) <= 0 || createMutation.isPending}
              >
                {createMutation.isPending ? t('common.saving') : t('common.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            </div>
            {createMutation.isError && (
              <p className="text-xs text-red-600 mt-2">
                {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.errorOccurred')}
              </p>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-gray-100 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t('products.transactions.addManual')}
            </Button>
          </div>
        )}

        {/* Transactions list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">{t('common.noData')}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const Icon = TYPE_ICONS[tx.type] ?? RefreshCw;
                const colorClass = TYPE_COLORS[tx.type] ?? 'text-gray-600 bg-gray-50';
                const qty = Number(tx.quantity);
                return (
                  <li key={tx.id} className="px-5 py-3.5 flex items-start gap-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${qty >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {qty >= 0 ? '+' : ''}{qty} {product.unit}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
                          {t(`products.transactions.type${tx.type as 'In' | 'Out' | 'Adjustment'}`)}
                        </span>
                        {tx.invoice && (
                          <span className="text-xs text-gray-500">
                            {t('products.transactions.invoiceRef')}: {tx.invoice.refNo ?? tx.invoice.id.slice(0, 8)}
                          </span>
                        )}
                        {tx.createdBy && (
                          <span className="text-xs text-gray-400">{tx.createdBy.name}</span>
                        )}
                      </div>
                      {tx.notes && <p className="text-xs text-gray-500 mt-0.5">{tx.notes}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
