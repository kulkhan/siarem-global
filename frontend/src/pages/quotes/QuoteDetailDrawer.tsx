import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Ship, FileText, ReceiptText } from 'lucide-react';
import { quotesApi } from '@/api/quotes';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

function fmt(v: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

interface Props {
  quoteId: string;
  onClose: () => void;
  onEdit: () => void;
}

export default function QuoteDetailDrawer({ quoteId, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [convertError, setConvertError] = useState<string | null>(null);

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote-detail', quoteId],
    queryFn: () => quotesApi.getOne(quoteId).then((r) => r.data.data),
    enabled: !!quoteId,
  });

  const convertMutation = useMutation({
    mutationFn: () => quotesApi.convertToInvoice(quoteId),
    onSuccess: () => {
      onClose();
      navigate('/invoices');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setConvertError(err?.response?.data?.message ?? 'Dönüştürme başarısız');
    },
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[480px] max-w-full h-full bg-white shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{t('quotes.detail')}</h2>
          <div className="flex items-center gap-2">
            {quote && quote.status !== 'CANCELLED' && quote.status !== 'REJECTED' && (
              <button
                onClick={() => { setConvertError(null); convertMutation.mutate(); }}
                disabled={convertMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                title="Tekliften taslak fatura oluştur"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                {convertMutation.isPending ? '...' : 'Faturaya Dönüştür'}
              </button>
            )}
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-gray-700"
            >
              {t('common.edit')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading || !quote ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Convert error */}
            {convertError && (
              <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {convertError}
              </div>
            )}

            {/* Quote number + status */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-base font-semibold text-gray-900">{quote.quoteNumber}</div>
                  {quote.createdBy && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t('quotes.fields.createdBy')}: {quote.createdBy.name}
                    </div>
                  )}
                  {quote.combinedInvoice && (
                    <span className="inline-block mt-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                      {t('quotes.fields.combinedInvoice')}
                    </span>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status] ?? ''}`}>
                  {t(`status.${quote.status.toLowerCase()}`, quote.status)}
                </span>
              </div>
            </div>

            {/* Pricing */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Fiyat
              </div>
              {!quote.priceEur && !quote.priceUsd && !quote.priceTry ? (
                <div className="text-sm text-gray-400">—</div>
              ) : (
                <div className="flex gap-6">
                  {quote.priceEur != null && (
                    <div>
                      <div className="text-[10px] text-gray-400 mb-0.5">EUR</div>
                      <div className="text-lg font-bold text-blue-700 tabular-nums">{fmt(quote.priceEur)}</div>
                    </div>
                  )}
                  {quote.priceUsd != null && (
                    <div>
                      <div className="text-[10px] text-gray-400 mb-0.5">USD</div>
                      <div className="text-lg font-bold text-green-700 tabular-nums">{fmt(quote.priceUsd)}</div>
                    </div>
                  )}
                  {quote.priceTry != null && (
                    <div>
                      <div className="text-[10px] text-gray-400 mb-0.5">TRY</div>
                      <div className="text-lg font-bold text-red-700 tabular-nums">{fmt(quote.priceTry)}</div>
                    </div>
                  )}
                </div>
              )}
              {quote.shipCount > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {t('quotes.fields.shipCount')}: {quote.shipCount}
                </div>
              )}
            </div>

            {/* Customer + Service */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0 text-xs">{t('quotes.fields.customer')}</span>
                <span className="font-medium text-gray-800">{quote.customer?.name ?? '—'}</span>
                <span className="text-gray-400 text-xs">({quote.customer?.shortCode})</span>
              </div>

              {quote.service && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0 text-xs mt-0.5">{t('quotes.fields.service')}</span>
                  <div>
                    <div className="font-medium text-gray-800">
                      {quote.service.serviceType
                        ? (lang === 'tr' ? quote.service.serviceType.nameTr : quote.service.serviceType.nameEn)
                        : '—'}
                    </div>
                    {quote.service.ship && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Ship className="w-3 h-3" />
                        {quote.service.ship.name}
                        {quote.service.ship.imoNumber && (
                          <span className="font-mono">({quote.service.ship.imoNumber})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {t('quotes.fields.quoteDate')}
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">
                    {new Date(quote.quoteDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                {quote.validUntil && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {t('quotes.fields.validUntil')}
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5">
                      {new Date(quote.validUntil).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Linked invoices */}
            {quote.invoices && quote.invoices.length > 0 && (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t('quotes.sections.invoices')}
                </div>
                <div className="space-y-1.5">
                  {quote.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-mono text-xs text-gray-700">{inv.refNo ?? '—'}</span>
                      <span className="text-xs text-gray-600 font-mono">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(inv.amount)} {inv.currency}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {(quote as { items?: Array<{ id: string; description: string; quantity: number; unitPrice: number; currency: string; total: number; product?: { code: string } | null }> }).items?.length ? (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Kalemler</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-1.5 font-medium">Açıklama</th>
                      <th className="text-right pb-1.5 font-medium w-12">Miktar</th>
                      <th className="text-right pb-1.5 font-medium w-20">Birim F.</th>
                      <th className="text-right pb-1.5 font-medium w-24">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(quote as { items?: Array<{ id: string; description: string; quantity: number; unitPrice: number; currency: string; total: number; product?: { code: string } | null }> }).items!.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 text-gray-700">
                          {item.product && <span className="font-mono text-gray-400 mr-1">[{item.product.code}]</span>}
                          {item.description}
                        </td>
                        <td className="py-1.5 text-right text-gray-500 tabular-nums">{item.quantity}</td>
                        <td className="py-1.5 text-right text-gray-500 tabular-nums">{fmt(item.unitPrice)} {item.currency}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-800 tabular-nums">{fmt(item.total)} {item.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Notes */}
            {quote.notes && (
              <div className="px-5 py-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {t('quotes.fields.notes')}
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{quote.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
