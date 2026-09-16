'use client';

import * as XLSX from 'xlsx';
import api from '@/lib/api';
import type { Company } from '@/lib/types';

export interface ExportColumn {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  getValue?: (row: any) => string | number;
}

export function exportToExcel(
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string,
  toast?: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void,
) {
  if (!data.length) {
    toast?.({ variant: 'destructive', title: 'Nothing to export', description: 'No rows match the current filters.' });
    return;
  }
  const exportData = data.map((row) => {
    const obj: Record<string, string | number> = {};
    for (const col of columns) {
      const val = col.getValue ? col.getValue(row) : row[col.key];
      obj[col.header] = val === undefined || val === null ? '' : val;
    }
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(14, c.header.length + 4) }));
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast?.({ title: 'Export complete', description: `Exported ${data.length} row(s).` });
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const fmtPKR = (n: number | string) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(num);
};

export const escPKR = (n: number | string) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  company?: Company | null;
  columns: ExportColumn[];
  rows: any[];
  footer?: { label: string; value: string | number }[];
}

export function printTableReport({ title, subtitle, company, columns, rows, footer }: PrintReportOptions) {
  if (!rows.length) {
    alert('No rows to print.');
    return;
  }
  const companyName = company?.name || 'Your Company';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || '';
  const logoUrl = company?.logo ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}` : null;
  const stampUrl = company?.stamp ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}` : null;

  const headHtml = columns
    .map((c) => `<th style="text-align:${c.align || 'left'}">${escapeHtml(c.header)}</th>`)
    .join('');

  const bodyHtml = rows
    .map((row) => {
      const tds = columns
        .map((c) => {
          const val = c.getValue ? c.getValue(row) : row[c.key];
          const text = val === undefined || val === null ? '' : String(val);
          return `<td style="text-align:${c.align || 'left'}">${escapeHtml(text)}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  const footerHtml = footer
    ? footer
        .map(
          (f) =>
            `<div class="tot-row"><span>${escapeHtml(f.label)}</span><span class="val">${escapeHtml(String(f.value))}</span></div>`,
        )
        .join('')
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#111827; background:#fff; }
  .container { max-width: 920px; margin: 0 auto; padding: 28px 16px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111827; padding-bottom:20px; margin-bottom:24px; }
  .brand { display:flex; gap:14px; align-items:flex-start; }
  .brand img { width:56px; height:56px; object-fit:contain; }
  .brand .name { font-size:22px; font-weight:700; color:#111827; }
  .brand .meta { font-size:12px; color:#6b7280; margin-top:3px; line-height:1.5; }
  .doc { text-align:right; }
  .doc .title { font-size:26px; font-weight:800; letter-spacing:1px; color:#059669; }
  .doc .sub { font-size:12px; color:#059669; font-weight:600; margin-top:2px; }
  .doc .rid { font-size:12px; color:#6b7280; margin-top:8px; line-height:1.7; }
  .doc .rid span { color:#111827; font-weight:600; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:16px; }
  th { background:#ecfdf5; color:#065f46; border:1px solid #d1d5db; padding:8px 10px; font-weight:700; }
  td { border:1px solid #d1d5db; padding:7px 10px; }
  tr:nth-child(even) td { background:#f9fafb; }
  .totals { margin-top:18px; margin-left:auto; width:350px; }
  .tot-row { display:flex; justify-content:space-between; padding:6px 10px; font-size:13px; border-bottom:1px solid #e5e7eb; }
  .tot-row .val { font-weight:600; }
  .tot-row.grand { background:#f0fdf4; font-weight:700; font-size:14px; border-top:2px solid #059669; }
  .tot-row.grand .val { color:#059669; }
  footer { margin-top:48px; border-top:1px solid #d1d5db; padding-top:20px; }
  .sigs { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:16px; }
  .sig { text-align:center; }
  .sig img { max-height:70px; max-width:160px; object-fit:contain; margin-bottom:4px; }
  .sig .line { border-bottom:1px solid #000; width:170px; margin-bottom:4px; }
  .sig .lbl { font-size:11px; color:#9ca3af; }
  .foot-text { text-align:center; color:#6b7280; margin-top:16px; }
  .foot-text .co { font-size:16px; font-weight:700; color:#111827; }
  .foot-text .thanks { font-size:11px; color:#9ca3af; margin-top:6px; }
  @media print { body { background:#fff; } .container { padding:0; } }
</style></head><body>
<div class="container">
  <header>
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ''}
      <div>
        <div class="name">${escapeHtml(companyName)}</div>
        ${companyAddress ? `<div class="meta">${escapeHtml(companyAddress)}</div>` : ''}
        ${companyPhone ? `<div class="meta">Phone: ${escapeHtml(companyPhone)}</div>` : ''}
      </div>
    </div>
    <div class="doc">
      <div class="title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ''}
      <div class="rid">
        Date: <span>${new Date().toLocaleDateString()}</span><br/>
        Time: <span>${new Date().toLocaleTimeString()}</span><br/>
        Records: <span>${rows.length}</span>
      </div>
    </div>
  </header>

  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>

  ${footer ? `<div class="totals">${footerHtml}</div>` : ''}

  <footer>
    <div class="sigs">
      <div class="sig">
        ${stampUrl ? `<img src="${escapeHtml(stampUrl)}" alt="Stamp" />` : ''}
        <div class="line"></div>
        <div class="lbl">Authorized Signature</div>
      </div>
    </div>
    <div class="foot-text">
      <div class="co">${escapeHtml(companyName)}</div>
      <div class="thanks">Thank you for your business!</div>
    </div>
  </footer>
</div>
<script>window.print();</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    alert('Please allow pop-ups to print the report.');
    URL.revokeObjectURL(url);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}