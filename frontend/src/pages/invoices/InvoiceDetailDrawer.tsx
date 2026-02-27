import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Ship, Trash2, Plus, AlertCircle } from 'lucide-react';
import { invoicesApi, type Payment } from '@/api/invoices';
import { Input } from '@/components/ui/input';

// ── Status colors ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

function fmt(amount: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// ── Payment form state ─────────────────────────────────────────────────────────

interface PaymentFormState {
  amount: string;
  currency: string;
  paymentDate: string;
  method: string;
  reference: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  invoiceId: string;
  onClose: () => void;
  onEdit: () => void;
}

export default function InvoiceDetailDrawer({ invoiceId, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: '',
    currency: 'EUR',
    paymentDate: new Date().toISOString().slice(0, 10),
    method: '',
    reference: '',
  });

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: () => invoicesApi.getOne(invoiceId).then((r) => r.data.data),
    enabled: !!invoiceId,
  });

  const addPaymentMutation = useMutation({
    mutationFn: () =>
      invoicesApi.addPayment(invoiceId, {
        amount: parseFloat(paymentForm.amount),
        currency: paymentForm.currency,
        paymentDate: paymentForm.paymentDate,
        method: paymentForm.method || undefined,
        reference: paymentForm.reference || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setShowPaymentForm(false);
      setPaymentForm({
        amount: '',
        currency: inv?.currency ?? 'EUR',
        paymentDate: new Date().toISOString().slice(0, 10),
        method: '',
        reference: '',
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => invoicesApi.deletePayment(invoiceId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  function handleOpenPaymentForm() {
    setPaymentForm((p) => ({ ...p, currency: inv?.currency ?? 'EUR' }));
    setShowPaymentForm(true);
  }

  const totalPaid = inv?.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const remaining = (inv?.amount ?? 0) - totalPaid;
  const isOverdue =
    !!inv?.dueDate &&
    new Date(inv.dueDate) < new Date() &&
    inv.status !== 'PAID' &&
    inv.status !== 'CANCELLED';

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[500px] max-w-full h-full bg-white shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{t('invoices.detail')}</h2>
          <div className="flex items-center gap-2">
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

        {isLoading || !inv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Invoice header: refNo + status */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {inv.refNo
                    ? <div className="font-mono text-base font-semibold text-gray-900">{inv.refNo}</div>
                    : <div className="text-sm text-gray-400">Fatura no girilmemiş</div>
                  }
                  {inv.createdBy && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t('invoices.fields.createdBy')}: {inv.createdBy.name}
                    </div>
                  )}
                  {inv.isCombined && (
                    <span className="inline-block mt-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                      {t('invoices.fields.isCombined')}
                    </span>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? ''}`}>
                  {t(`status.${inv.status.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`, inv.status)}
                </span>
              </div>
            </div>

            {/* Amount section */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {fmt(inv.amount)}
                <span className="text-base font-semibold text-gray-500 ml-2">{inv.currency}</span>
              </div>
              {(inv.payments?.length ?? 0) > 0 && (
                <div className="flex gap-4 mt-1.5">
                  <div className="text-xs text-green-700 font-medium">
                    ✓ {t('invoices.payments.total')}: {fmt(totalPaid)} {inv.currency}
                  </div>
                  {remaining > 0.005 && (
                    <div className="text-xs text-orange-700 font-medium">
                      ⚡ {t('invoices.payments.remaining')}: {fmt(remaining)} {inv.currency}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Customer + Service */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0 text-xs">{t('invoices.fields.customer')}</span>
                <span className="font-medium text-gray-800">{inv.customer?.name ?? '—'}</span>
                <span className="text-gray-400 text-xs">({inv.customer?.shortCode})</span>
              </div>

              {inv.service && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0 text-xs mt-0.5">{t('invoices.fields.service')}</span>
                  <div>
                    <div className="font-medium text-gray-800">
                      {inv.service.serviceType
                        ? (lang === 'tr' ? inv.service.serviceType.nameTr : inv.service.serviceType.nameEn)
                        : '—'}
                    </div>
                    {inv.service.ship && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Ship className="w-3 h-3" />
                        {inv.service.ship.name}
                        {inv.service.ship.imoNumber && (
                          <span className="font-mono">({inv.service.ship.imoNumber})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {inv.quote && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0 text-xs">Teklif</span>
                  <span className="font-mono text-xs text-gray-700">{inv.quote.quoteNumber}</span>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {t('invoices.fields.invoiceDate')}
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">
                    {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>

                {inv.dueDate && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {t('invoices.fields.dueDate')}
                    </div>
                    <div className={`text-sm mt-0.5 font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {isOverdue && <AlertCircle className="w-3 h-3 shrink-0" />}
                      {new Date(inv.dueDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )}

                {inv.sentAt && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {t('invoices.fields.sentAt')}
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5">
                      {new Date(inv.sentAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payments section */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('invoices.sections.payments')}
                  {(inv.payments?.length ?? 0) > 0 && (
                    <span className="ml-2 text-gray-400 font-normal normal-case">
                      ({inv.payments!.length})
                    </span>
                  )}
                </h3>
                {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && !showPaymentForm && (
                  <button
                    onClick={handleOpenPaymentForm}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('invoices.payments.add')}
                  </button>
                )}
              </div>

              {/* Add payment form */}
              {showPaymentForm && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        {t('invoices.fields.paymentAmount')} *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">{t('invoices.fields.currency')}</label>
                      <select
                        value={paymentForm.currency}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, currency: e.target.value }))}
                        className="h-8 w-full px-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="TRY">TRY</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">
                        {t('invoices.fields.paymentDate')} *
                      </label>
                      <Input
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">{t('invoices.fields.paymentMethod')}</label>
                      <Input
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}
                        placeholder="Banka Transferi..."
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 mb-1 block">{t('invoices.fields.paymentReference')}</label>
                    <Input
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                      placeholder="Dekont / referans no..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addPaymentMutation.mutate()}
                      disabled={!paymentForm.amount || !paymentForm.paymentDate || addPaymentMutation.isPending}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {addPaymentMutation.isPending ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment list */}
              {!inv.payments || inv.payments.length === 0 ? (
                <div className="text-xs text-gray-400">{t('invoices.payments.noPayments')}</div>
              ) : (
                <div>
                  {inv.payments.map((payment: Payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-800">
                            {fmt(payment.amount)} {payment.currency}
                          </span>
                          {payment.method && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {payment.method}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                          {payment.reference && (
                            <span className="ml-2 font-mono text-gray-500">{payment.reference}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deletePaymentMutation.mutate(payment.id)}
                        disabled={deletePaymentMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0 ml-2"
                        title={t('invoices.payments.deleteConfirm')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {inv.notes && (
              <div className="px-5 py-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {t('invoices.fields.notes')}
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{inv.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
