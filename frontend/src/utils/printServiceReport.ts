import type { ServiceReport } from '@/api/serviceReport';

export function printServiceReport(report: ServiceReport) {
  const win = window.open('', '_blank');
  if (!win) return;

  const date = new Date(report.reportDate).toLocaleDateString('tr-TR');
  const createdAt = new Date(report.createdAt).toLocaleDateString('tr-TR');

  win.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Servis Raporu</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 32px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 4px; }
    .value { font-size: 14px; white-space: pre-wrap; border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; min-height: 40px; }
    .meta { display: flex; gap: 32px; margin-bottom: 24px; }
    .meta-item { font-size: 13px; color: #555; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-draft { background: #f3f4f6; color: #374151; }
    .badge-final { background: #dcfce7; color: #166534; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Servis Tamamlama Raporu</h1>
  <div class="sub">Service Completion Report</div>

  <div class="meta">
    <div class="meta-item"><strong>Rapor Tarihi:</strong> ${date}</div>
    <div class="meta-item"><strong>Oluşturan:</strong> ${report.createdBy?.name ?? '—'}</div>
    <div class="meta-item"><strong>Oluşturulma:</strong> ${createdAt}</div>
    <div class="meta-item">
      <span class="badge ${report.status === 'FINALIZED' ? 'badge-final' : 'badge-draft'}">
        ${report.status === 'FINALIZED' ? 'Kesinleştirildi' : 'Taslak'}
      </span>
    </div>
  </div>

  <div class="section">
    <div class="label">Yapılan İşler / Work Done</div>
    <div class="value">${escapeHtml(report.workDone)}</div>
  </div>

  ${report.findings ? `
  <div class="section">
    <div class="label">Bulgular / Findings</div>
    <div class="value">${escapeHtml(report.findings)}</div>
  </div>` : ''}

  ${report.partsUsed ? `
  <div class="section">
    <div class="label">Kullanılan Parçalar / Parts Used</div>
    <div class="value">${escapeHtml(report.partsUsed)}</div>
  </div>` : ''}

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
