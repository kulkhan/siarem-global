/* Shared print-to-PDF utility for oddyCRM documents */

function esc(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(n?: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
}

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; }
  @page { margin: 18mm 20mm; }

  /* ── Header ── */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; margin-bottom: 18px; border-bottom: 2.5px solid #2563eb; }
  .company-block { display: flex; align-items: center; gap: 12px; }
  .company-logo { max-width: 90px; max-height: 48px; object-fit: contain; }
  .company-name { font-size: 15pt; font-weight: 700; color: #0f172a; }
  .doc-block { text-align: right; }
  .doc-title { font-size: 14pt; font-weight: 700; color: #2563eb; letter-spacing: -0.3px; }
  .doc-number { font-size: 11pt; font-weight: 600; color: #334155; margin-top: 3px; font-family: monospace; }
  .doc-date { font-size: 9pt; color: #64748b; margin-top: 2px; }

  /* ── Sections ── */
  .section { margin-bottom: 16px; }
  .section-title { font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }

  /* ── Info grid ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-item label { font-size: 8pt; color: #64748b; display: block; margin-bottom: 1px; }
  .info-item span { font-size: 10pt; color: #1e293b; font-weight: 500; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  thead tr { background: #f1f5f9; }
  th { padding: 6px 8px; text-align: left; font-size: 8pt; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; }
  th.r, td.r { text-align: right; }
  td { padding: 5px 8px; color: #334155; border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child td { border-bottom: none; }
  tfoot td { font-weight: 700; color: #0f172a; padding: 6px 8px; border-top: 1.5px solid #cbd5e1; }

  /* ── Status badge ── */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 8pt; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-orange { background: #ffedd5; color: #c2410c; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-gray { background: #f1f5f9; color: #475569; }

  /* ── Notes ── */
  .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; font-size: 9.5pt; color: #475569; white-space: pre-wrap; line-height: 1.5; }

  /* ── Totals ── */
  .totals { margin-top: 12px; display: flex; justify-content: flex-end; gap: 32px; }
  .total-item { text-align: right; }
  .total-item .currency { font-size: 8pt; color: #64748b; }
  .total-item .amount { font-size: 14pt; font-weight: 700; }
  .eur { color: #1d4ed8; }
  .usd { color: #15803d; }
  .try { color: #dc2626; }

  /* ── Footer ── */
  .doc-footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
`;

function openPrint(html: string, title: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}

function headerHtml(companyLogoUrl: string | null | undefined, companyName: string | null | undefined, docTitle: string, docNumber: string, docDate?: string): string {
  const logoHtml = companyLogoUrl
    ? `<img src="${esc(companyLogoUrl)}" class="company-logo" />`
    : '';
  const nameHtml = companyName ? `<div class="company-name">${esc(companyName)}</div>` : '';
  return `
    <div class="doc-header">
      <div class="company-block">${logoHtml}${nameHtml}</div>
      <div class="doc-block">
        <div class="doc-title">${esc(docTitle)}</div>
        <div class="doc-number">${esc(docNumber)}</div>
        ${docDate ? `<div class="doc-date">${esc(docDate)}</div>` : ''}
      </div>
    </div>
  `;
}

/* ───────────────────────────────────────── Quote ── */

export interface PrintQuoteData {
  quoteNumber: string;
  quoteDate: string;
  validUntil?: string | null;
  status: string;
  notes?: string | null;
  priceEur?: number | null;
  priceUsd?: number | null;
  priceTry?: number | null;
  customer?: { name?: string; shortCode?: string; city?: string; country?: string } | null;
  service?: {
    ship?: { name?: string; imoNumber?: string } | null;
    serviceType?: { nameTr?: string; nameEn?: string } | null;
  } | null;
  items?: Array<{ description: string; quantity: number; unitPrice: number; currency: string; total: number; product?: { code: string } | null }> | null;
}

export interface PrintCompany {
  name?: string;
  logoUrl?: string | null;
}

export function printQuote(quote: PrintQuoteData, company?: PrintCompany | null, lang = 'tr') {
  const items = quote.items ?? [];
  const currencies = [...new Set(items.map((i) => i.currency))];

  const itemsSection = items.length ? `
    <div class="section">
      <div class="section-title">Kalemler</div>
      <table>
        <thead>
          <tr>
            <th>Açıklama</th>
            <th class="r" style="width:60px">Miktar</th>
            <th class="r" style="width:100px">Birim Fiyat</th>
            <th class="r" style="width:110px">Toplam</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td>${it.product ? `<span style="font-family:monospace;color:#94a3b8">[${esc(it.product.code)}]</span> ` : ''}${esc(it.description)}</td>
              <td class="r">${it.quantity}</td>
              <td class="r" style="font-family:monospace">${fmtNum(it.unitPrice)} ${esc(it.currency)}</td>
              <td class="r" style="font-family:monospace;font-weight:600">${fmtNum(it.total)} ${esc(it.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          ${currencies.map((cur) => {
            const total = items.filter((i) => i.currency === cur).reduce((s, i) => s + (Number(i.total) || 0), 0);
            return `<tr><td colspan="3" class="r">Toplam (${esc(cur)})</td><td class="r" style="font-family:monospace">${fmtNum(total)} ${esc(cur)}</td></tr>`;
          }).join('')}
        </tfoot>
      </table>
    </div>
  ` : '';

  const hasPrices = quote.priceEur != null || quote.priceUsd != null || quote.priceTry != null;
  const pricesSection = hasPrices ? `
    <div class="totals">
      ${quote.priceEur != null ? `<div class="total-item"><div class="currency">EUR</div><div class="amount eur">${fmtNum(quote.priceEur)}</div></div>` : ''}
      ${quote.priceUsd != null ? `<div class="total-item"><div class="currency">USD</div><div class="amount usd">${fmtNum(quote.priceUsd)}</div></div>` : ''}
      ${quote.priceTry != null ? `<div class="total-item"><div class="currency">TRY</div><div class="amount try">${fmtNum(quote.priceTry)}</div></div>` : ''}
    </div>
  ` : '';

  const html = `
    ${headerHtml(company?.logoUrl, company?.name, 'TEKLİF', quote.quoteNumber, fmtDate(quote.quoteDate))}

    <div class="section">
      <div class="section-title">Genel Bilgiler</div>
      <div class="info-grid">
        <div class="info-item"><label>Müşteri</label><span>${esc(quote.customer?.name)} ${quote.customer?.shortCode ? `(${esc(quote.customer.shortCode)})` : ''}</span></div>
        <div class="info-item"><label>Teklif Tarihi</label><span>${fmtDate(quote.quoteDate)}</span></div>
        ${quote.validUntil ? `<div class="info-item"><label>Geçerlilik</label><span>${fmtDate(quote.validUntil)}</span></div>` : ''}
        ${quote.customer?.city || quote.customer?.country ? `<div class="info-item"><label>Konum</label><span>${[quote.customer?.city, quote.customer?.country].filter(Boolean).map(esc).join(', ')}</span></div>` : ''}
        ${quote.service?.ship ? `<div class="info-item"><label>Gemi</label><span>${esc(quote.service.ship.name)}${quote.service.ship.imoNumber ? ` (${esc(quote.service.ship.imoNumber)})` : ''}</span></div>` : ''}
        ${quote.service?.serviceType ? `<div class="info-item"><label>Servis Tipi</label><span>${esc(lang === 'tr' ? quote.service.serviceType.nameTr : quote.service.serviceType.nameEn)}</span></div>` : ''}
      </div>
    </div>

    ${itemsSection}
    ${!itemsSection ? pricesSection : pricesSection}

    ${quote.notes ? `<div class="section"><div class="section-title">Notlar</div><div class="notes">${esc(quote.notes)}</div></div>` : ''}
    <div class="doc-footer">Bu belge oddyCRM tarafından oluşturulmuştur · ${new Date().toLocaleDateString('tr-TR')}</div>
  `;

  openPrint(html, `Teklif ${quote.quoteNumber}`);
}

/* ───────────────────────────────────────── Invoice ── */

export interface PrintInvoiceData {
  refNo?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  status: string;
  amount: number;
  currency: string;
  notes?: string | null;
  customer?: { name?: string; shortCode?: string; city?: string; country?: string } | null;
  service?: {
    ship?: { name?: string; imoNumber?: string } | null;
    serviceType?: { nameTr?: string; nameEn?: string } | null;
  } | null;
  items?: Array<{ description: string; quantity: number; unitPrice: number; currency: string; total: number; product?: { code: string } | null }> | null;
  payments?: Array<{ amount: number; currency: string; paymentDate: string; method?: string | null }> | null;
}

export function printInvoice(inv: PrintInvoiceData, company?: PrintCompany | null, lang = 'tr') {
  const items = inv.items ?? [];
  const currencies = [...new Set(items.map((i) => i.currency))];

  const itemsSection = items.length ? `
    <div class="section">
      <div class="section-title">Kalemler</div>
      <table>
        <thead>
          <tr>
            <th>Açıklama</th>
            <th class="r" style="width:60px">Miktar</th>
            <th class="r" style="width:100px">Birim Fiyat</th>
            <th class="r" style="width:110px">Toplam</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td>${it.product ? `<span style="font-family:monospace;color:#94a3b8">[${esc(it.product.code)}]</span> ` : ''}${esc(it.description)}</td>
              <td class="r">${it.quantity}</td>
              <td class="r" style="font-family:monospace">${fmtNum(it.unitPrice)} ${esc(it.currency)}</td>
              <td class="r" style="font-family:monospace;font-weight:600">${fmtNum(it.total)} ${esc(it.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          ${currencies.map((cur) => {
            const total = items.filter((i) => i.currency === cur).reduce((s, i) => s + (Number(i.total) || 0), 0);
            return `<tr><td colspan="3" class="r">Toplam (${esc(cur)})</td><td class="r" style="font-family:monospace">${fmtNum(total)} ${esc(cur)}</td></tr>`;
          }).join('')}
        </tfoot>
      </table>
    </div>
  ` : '';

  const paymentsSection = inv.payments?.length ? `
    <div class="section">
      <div class="section-title">Ödemeler</div>
      <table>
        <thead><tr><th>Tarih</th><th>Yöntem</th><th class="r">Tutar</th></tr></thead>
        <tbody>
          ${inv.payments.map((p) => `
            <tr>
              <td>${fmtDate(p.paymentDate)}</td>
              <td>${esc(p.method) || '—'}</td>
              <td class="r" style="font-family:monospace">${fmtNum(p.amount)} ${esc(p.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const html = `
    ${headerHtml(company?.logoUrl, company?.name, 'FATURA', inv.refNo ?? '—', fmtDate(inv.invoiceDate))}

    <div class="section">
      <div class="section-title">Genel Bilgiler</div>
      <div class="info-grid">
        <div class="info-item"><label>Müşteri</label><span>${esc(inv.customer?.name)} ${inv.customer?.shortCode ? `(${esc(inv.customer.shortCode)})` : ''}</span></div>
        <div class="info-item"><label>Fatura Tarihi</label><span>${fmtDate(inv.invoiceDate)}</span></div>
        ${inv.dueDate ? `<div class="info-item"><label>Son Ödeme</label><span>${fmtDate(inv.dueDate)}</span></div>` : ''}
        <div class="info-item"><label>Tutar</label><span style="font-family:monospace;font-weight:700">${fmtNum(inv.amount)} ${esc(inv.currency)}</span></div>
        ${inv.service?.ship ? `<div class="info-item"><label>Gemi</label><span>${esc(inv.service.ship.name)}${inv.service.ship.imoNumber ? ` (${esc(inv.service.ship.imoNumber)})` : ''}</span></div>` : ''}
        ${inv.service?.serviceType ? `<div class="info-item"><label>Servis Tipi</label><span>${esc(lang === 'tr' ? inv.service.serviceType.nameTr : inv.service.serviceType.nameEn)}</span></div>` : ''}
      </div>
    </div>

    ${itemsSection}
    ${paymentsSection}
    ${inv.notes ? `<div class="section"><div class="section-title">Notlar</div><div class="notes">${esc(inv.notes)}</div></div>` : ''}
    <div class="doc-footer">Bu belge oddyCRM tarafından oluşturulmuştur · ${new Date().toLocaleDateString('tr-TR')}</div>
  `;

  openPrint(html, `Fatura ${inv.refNo ?? ''}`);
}

/* ───────────────────────────────────────── Service ── */

export interface PrintServiceData {
  refNo?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  description?: string | null;
  notes?: string | null;
  customer?: { name?: string; shortCode?: string } | null;
  ship?: { name?: string; imoNumber?: string } | null;
  serviceType?: { nameTr?: string; nameEn?: string } | null;
  assignees?: Array<{ user: { name: string } }> | null;
}

const SERVICE_STATUS_TR: Record<string, string> = {
  OPEN: 'Açık', IN_PROGRESS: 'Devam Ediyor', COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal', ON_HOLD: 'Beklemede',
};

export function printService(svc: PrintServiceData, company?: PrintCompany | null, lang = 'tr') {
  const html = `
    ${headerHtml(company?.logoUrl, company?.name, 'SERVİS DETAYI', svc.refNo ?? '—', fmtDate(svc.startDate))}

    <div class="section">
      <div class="section-title">Genel Bilgiler</div>
      <div class="info-grid">
        <div class="info-item"><label>Müşteri</label><span>${esc(svc.customer?.name)} ${svc.customer?.shortCode ? `(${esc(svc.customer.shortCode)})` : ''}</span></div>
        ${svc.serviceType ? `<div class="info-item"><label>Servis Tipi</label><span>${esc(lang === 'tr' ? svc.serviceType.nameTr : svc.serviceType.nameEn)}</span></div>` : ''}
        ${svc.ship ? `<div class="info-item"><label>Gemi</label><span>${esc(svc.ship.name)}${svc.ship.imoNumber ? ` (${esc(svc.ship.imoNumber)})` : ''}</span></div>` : ''}
        <div class="info-item"><label>Durum</label><span>${esc(SERVICE_STATUS_TR[svc.status] ?? svc.status)}</span></div>
        ${svc.startDate ? `<div class="info-item"><label>Başlangıç</label><span>${fmtDate(svc.startDate)}</span></div>` : ''}
        ${svc.endDate ? `<div class="info-item"><label>Bitiş</label><span>${fmtDate(svc.endDate)}</span></div>` : ''}
        ${svc.assignees?.length ? `<div class="info-item"><label>Atanan</label><span>${svc.assignees.map((a) => esc(a.user.name)).join(', ')}</span></div>` : ''}
      </div>
    </div>

    ${svc.description ? `<div class="section"><div class="section-title">Açıklama</div><div class="notes">${esc(svc.description)}</div></div>` : ''}
    ${svc.notes ? `<div class="section"><div class="section-title">Notlar</div><div class="notes">${esc(svc.notes)}</div></div>` : ''}
    <div class="doc-footer">Bu belge oddyCRM tarafından oluşturulmuştur · ${new Date().toLocaleDateString('tr-TR')}</div>
  `;

  openPrint(html, `Servis ${svc.refNo ?? ''}`);
}
