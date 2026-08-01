'use client';

import type { Company } from '@/lib/types';
import QRCode from 'qrcode';
import api from '@/lib/api';

export interface SaleReceiptItem {
  productName: string;
  quantity: number;
  price: number;
  saleTax: number;
  wthTax: number;
  serialNumber?: string;
}

export interface SaleReceiptData {
  id: string;
  invoiceNumber: number;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  items: SaleReceiptItem[];
  isInstallment?: boolean;
  installmentInfo?: {
    planName: string;
    totalInstallments: number;
    paidInstallments: number;
    nextInstallment: number;
    installmentAmount: number;
    totalAmount: number;
    remainingInstallments: number;
    percentage: number;
    status?: string;
  } | null;
}

type ReceiptSize = 'a4' | 'thermal';

const formatPKR = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (d: string) => (d ? new Date(d).toLocaleString() : new Date().toLocaleString());

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds a self-contained, printable receipt and opens it in a NEW BROWSER TAB
 * (not a popup window). The tab provides its own Print button.
 */
export async function printSaleReceipt(
  sale: SaleReceiptData,
  company: Company | null | undefined,
  size: ReceiptSize
) {
  const html = await buildReceiptHtml(sale, company, size);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    alert('Please allow pop-ups to print the receipt.');
    URL.revokeObjectURL(url);
    return;
  }
  // Revoke the blob URL once the new tab has had a chance to load it.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function buildReceiptHtml(
  sale: SaleReceiptData,
  company: Company | null | undefined,
  size: ReceiptSize
): Promise<string> {
  const companyName = company?.name || 'Your Company';
  const companyAddress = company?.address || '';
  const companyPhone = company?.contact1 || '';
  const companyEmail = company?.email || '';

  const logoUrl = company?.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${company.id}`
    : null;
  const stampUrl = company?.stamp
    ? `${api?.defaults?.baseURL}/uploads/company_stamps/${company.id}`
    : null;

  return size === 'thermal'
    ? buildThermalReceipt(sale, companyName, companyAddress, companyPhone, logoUrl)
    : buildA4Receipt(sale, companyName, companyAddress, companyPhone, companyEmail, logoUrl, stampUrl);
}

/* ------------------------------------------------------------------ */
/*  A4 RECEIPT — beautified                                           */
/* ------------------------------------------------------------------ */
function buildA4Receipt(
  sale: SaleReceiptData,
  companyName: string,
  address: string,
  phone: string,
  email: string,
  logoUrl: string | null,
  stampUrl: string | null
): string {
  const totalSaleTax = (sale.items || []).reduce((sum, i) => sum + (Number(i.saleTax) || 0), 0);
  const totalWthTax = (sale.items || []).reduce((sum, i) => sum + (Number(i.wthTax) || 0), 0);
  const subtotal = (sale.items || []).reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);
  const total = subtotal + totalSaleTax + totalWthTax;

  const inst = sale.installmentInfo;
  const isInst = sale.isInstallment && inst;

  const totalQty = (sale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const productNames = (sale.items || []).map(i => escapeHtml(i.productName)).join(', ');

  const paidAmount = isInst ? inst!.installmentAmount * inst!.paidInstallments : 0;
  const remainingAmount = isInst ? inst!.installmentAmount * inst!.remainingInstallments : 0;

  if (isInst) {
    const instStatus = inst!.status === 'completed' ? 'COMPLETED' : 'ACTIVE';
    const instStatusClass = inst!.status === 'completed' ? 'status-paid' : 'status-pending';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Installment Invoice #${sale.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#111827; background:#fff; padding:0; }
  .container { max-width:800px; margin:0 auto; padding:32px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111827; padding-bottom:24px; margin-bottom:32px; }
  .brand { display:flex; gap:16px; align-items:flex-start; }
  .brand img { width:60px; height:60px; object-fit:contain; }
  .brand .name { font-size:24px; font-weight:700; color:#111827; }
  .brand .meta { font-size:13px; color:#6b7280; margin-top:4px; line-height:1.5; }
  .doc { text-align:right; }
  .doc .title { font-size:36px; font-weight:800; letter-spacing:2px; color:#059669; }
  .doc .rid { font-size:13px; color:#6b7280; margin-top:8px; line-height:1.8; }
  .doc .rid span { color:#111827; font-weight:600; }
  .status-pill { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; }
  .status-paid { background:#dcfce7; color:#166534; }
  .status-pending { background:#fef9c3; color:#854d0e; }
  .amounts-box { border:2px solid #059669; border-radius:10px; overflow:hidden; margin-bottom:32px; }
  .amounts-box .box-header { background:#059669; color:#fff; padding:10px 16px; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
  .amounts-box .box-row { display:flex; justify-content:space-between; padding:10px 16px; font-size:13px; border-bottom:1px solid #e5e7eb; }
  .amounts-box .box-row:last-child { border-bottom:none; }
  .amounts-box .box-row .label { color:#6b7280; }
  .amounts-box .box-row .value { font-weight:600; }
  .amounts-box .box-row.info .value { font-weight:700; color:#111827; }
  .amounts-box .box-row.total { background:#f0fdf4; font-weight:700; font-size:15px; }
  .amounts-box .box-row.total .value { color:#059669; }
  .amounts-box .box-row.paid .value { color:#16a34a; }
  .amounts-box .box-row.remaining .value { color:#d97706; }
  .amounts-box .box-row.per-inst .value { color:#1d4ed8; }
  .amounts-box .divider { border-top:2px solid #059669; margin:0; }
  footer { margin-top:48px; border-top:1px solid #d1d5db; padding-top:24px; }
  .sigs { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; }
  .sig { text-align:center; }
  .sig img { max-height:80px; max-width:180px; object-fit:contain; margin-bottom:4px; }
  .sig .line { border-bottom:1px solid #000; width:200px; margin-bottom:4px; }
  .sig .lbl { font-size:11px; color:#9ca3af; }
  .foot-text { text-align:center; color:#6b7280; margin-top:24px; }
  .foot-text .co { font-size:18px; font-weight:700; color:#111827; }
  .foot-text .sub { font-size:13px; margin-top:4px; }
  .foot-text .thanks { font-size:12px; color:#9ca3af; margin-top:8px; }
  @media print { body { background:#fff; } .container { padding:0; } .no-print { display:none; } }
</style></head>
<body>
<div class="container">
  <header>
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ''}
      <div>
        <div class="name">${escapeHtml(companyName)}</div>
        ${address ? `<div class="meta">${escapeHtml(address)}</div>` : ''}
        ${phone ? `<div class="meta">Phone: ${escapeHtml(phone)}</div>` : ''}
        ${email ? `<div class="meta">Email: ${escapeHtml(email)}</div>` : ''}
      </div>
    </div>
    <div class="doc">
      <div class="title">INSTALLMENT INVOICE</div>
      <div class="rid">
        Sale #: <span>${sale.invoiceNumber}</span><br/>
        Date: <span>${escapeHtml(fmtDate(sale.date))}</span><br/>
        Plan: <span>${escapeHtml(inst!.planName)}</span><br/>
        Status: <span class="status-pill ${instStatusClass}">${instStatus}</span>
      </div>
    </div>
  </header>

  <div class="amounts-box">
    <div class="box-header">Invoice Details</div>
    <div class="box-row info">
      <span class="label">Customer Name</span>
      <span class="value">${escapeHtml(sale.subscriberName || 'Walk-in')}</span>
    </div>
    <div class="box-row info">
      <span class="label">Payment Method</span>
      <span class="value">${escapeHtml((sale.paymentMethod || '').toUpperCase())}</span>
    </div>
    <div class="box-row info">
      <span class="label">Products</span>
      <span class="value" style="max-width:450px;text-align:right">${productNames || '---'}</span>
    </div>
    <div class="box-row info">
      <span class="label">Total Items</span>
      <span class="value">${totalQty}</span>
    </div>
    <div class="divider"></div>
    <div class="box-row per-inst">
      <span class="label">Amount per Installment</span>
      <span class="value">PKR ${formatPKR(inst!.installmentAmount)}</span>
    </div>
    <div class="box-row paid">
      <span class="label">Paid Installments</span>
      <span class="value">${inst!.paidInstallments} / ${inst!.totalInstallments}</span>
    </div>
    <div class="box-row remaining">
      <span class="label">Remaining Installments</span>
      <span class="value">${inst!.remainingInstallments} / ${inst!.totalInstallments}</span>
    </div>
    <div class="box-row paid">
      <span class="label">Paid Amount</span>
      <span class="value">PKR ${formatPKR(paidAmount)}</span>
    </div>
    <div class="box-row remaining">
      <span class="label">Remaining Amount</span>
      <span class="value">PKR ${formatPKR(remainingAmount)}</span>
    </div>
    <div class="box-row total">
      <span class="label">Per Installment Balance</span>
      <span class="value">PKR ${formatPKR(inst!.installmentAmount)}</span>
    </div>
  </div>

  <footer>
    <div class="sigs">
      <div class="sig">
        ${stampUrl
          ? `<img src="${escapeHtml(stampUrl)}" alt="Company Stamp" onerror="this.style.display='none'" />`
          : `<div class="line"></div>`}
        <div class="lbl">Company Stamp</div>
      </div>
      <div class="sig">
        <div class="line"></div>
        <div class="lbl">Authorized Signature</div>
      </div>
    </div>
    <div class="foot-text">
      <div class="co">${escapeHtml(companyName)}</div>
      ${phone || email ? `<div class="sub">Phone: ${escapeHtml(phone)} | Email: ${escapeHtml(email)}</div>` : ''}
      <div class="thanks">Thank you for your business!</div>
    </div>
  </footer>
</div>
<div class="no-print" style="text-align:center;margin:16px 0">
  <button onclick="window.print()" style="padding:10px 22px;background:#111827;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Print Receipt</button>
</div>
</body></html>`;
  }

  // ── REGULAR A4 — product table ──
  const itemRows = (sale.items || [])
    .map(
      (item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        const saleTax = Number(item.saleTax) || 0;
        const wthTax = Number(item.wthTax) || 0;
        const amount = (price * qty) + saleTax + wthTax;
        return `
      <tr>
        <td class="border border-gray-300 p-3">${escapeHtml(item.productName)}</td>
        <td class="border border-gray-300 p-3 text-xs font-mono">${escapeHtml(item.serialNumber || '')}</td>
        <td class="border border-gray-300 p-3 text-right">${formatPKR(price)}</td>
        <td class="border border-gray-300 p-3 text-center font-semibold">${qty}</td>
        <td class="border border-gray-300 p-3 text-right">${formatPKR(price)}</td>
        <td class="border border-gray-300 p-3 text-right">${formatPKR(saleTax)}</td>
        <td class="border border-gray-300 p-3 text-right">${formatPKR(wthTax)}</td>
        <td class="border border-gray-300 p-3 text-right font-semibold">${formatPKR(amount)}</td>
      </tr>`;
      }
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Sale Receipt #${sale.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#111827; background:#fff; padding:0; }
  .container { max-width:800px; margin:0 auto; padding:32px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111827; padding-bottom:24px; margin-bottom:32px; }
  .brand { display:flex; gap:16px; align-items:flex-start; }
  .brand img { width:60px; height:60px; object-fit:contain; }
  .brand .name { font-size:24px; font-weight:700; color:#111827; }
  .brand .meta { font-size:13px; color:#6b7280; margin-top:4px; line-height:1.5; }
  .doc { text-align:right; }
  .doc .title { font-size:36px; font-weight:800; letter-spacing:2px; color:#059669; }
  .doc .rid { font-size:13px; color:#6b7280; margin-top:8px; line-height:1.8; }
  .doc .rid span { color:#111827; font-weight:600; }
  .status-pill { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; }
  .status-paid { background:#dcfce7; color:#166534; }
  .status-pending { background:#fef9c3; color:#854d0e; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  thead tr { background:#059669; color:#fff; }
  thead th { padding:10px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #d1d5db; }
  thead th.text-right { text-align:right; }
  thead th.text-center { text-align:center; }
  tbody td { padding:10px; font-size:13px; border:1px solid #d1d5db; }
  tbody tr:hover { background:rgba(236,253,245,0.5); }
  .summary { display:flex; justify-content:flex-end; margin-bottom:32px; }
  .summary table { width:260px; margin-bottom:0; border-collapse:collapse; }
  .summary td { padding:3px 0; font-size:13px; color:#6b7280; }
  .summary td:last-child { text-align:right; }
  footer { margin-top:48px; border-top:1px solid #d1d5db; padding-top:24px; }
  .sigs { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; }
  .sig { text-align:center; }
  .sig img { max-height:80px; max-width:180px; object-fit:contain; margin-bottom:4px; }
  .sig .line { border-bottom:1px solid #000; width:200px; margin-bottom:4px; }
  .sig .lbl { font-size:11px; color:#9ca3af; }
  .foot-text { text-align:center; color:#6b7280; margin-top:24px; }
  .foot-text .co { font-size:18px; font-weight:700; color:#111827; }
  .foot-text .sub { font-size:13px; margin-top:4px; }
  .foot-text .thanks { font-size:12px; color:#9ca3af; margin-top:8px; }
  @media print { body { background:#fff; } .container { padding:0; } .no-print { display:none; } }
</style></head>
<body>
<div class="container">
  <header>
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ''}
      <div>
        <div class="name">${escapeHtml(companyName)}</div>
        ${address ? `<div class="meta">${escapeHtml(address)}</div>` : ''}
        ${phone ? `<div class="meta">Phone: ${escapeHtml(phone)}</div>` : ''}
        ${email ? `<div class="meta">Email: ${escapeHtml(email)}</div>` : ''}
      </div>
    </div>
    <div class="doc">
      <div class="title">INVOICE</div>
      <div class="rid">
        Sale #: <span>${sale.invoiceNumber}</span><br/>
        Date: <span>${escapeHtml(fmtDate(sale.date))}</span><br/>
        Status: <span class="status-pill status-${escapeHtml(sale.paymentMethod === 'cash' ? 'paid' : 'pending')}">${escapeHtml((sale.paymentMethod === 'cash' ? 'PAID' : sale.paymentMethod || 'PENDING').toUpperCase())}</span>
      </div>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>SN / MAC</th>
        <th class="text-right">Price</th>
        <th class="text-center">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Sale Tax</th>
        <th class="text-right">WTH</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="8" style="text-align:center;color:#9ca3af">No items</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <table>
      <tbody>
        <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:3px 0;font-size:13px;color:#6b7280;text-align:right;">PKR ${formatPKR(subtotal)}</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;">Total Sale Tax</td><td style="padding:3px 0;font-size:13px;color:#6b7280;text-align:right;">PKR ${formatPKR(totalSaleTax)}</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;">Total WTH</td><td style="padding:3px 0;font-size:13px;color:#6b7280;text-align:right;">PKR ${formatPKR(totalWthTax)}</td></tr>
        <tr><td style="padding:6px 0 0 0;border-top:2px solid #111827;font-weight:700;font-size:13px;text-transform:uppercase;">Total</td><td style="padding:6px 0 0 0;border-top:2px solid #111827;font-weight:700;font-size:16px;text-align:right;">PKR ${formatPKR(total)}</td></tr>
      </tbody>
    </table>
  </div>

  <footer>
    <div class="sigs">
      <div class="sig">
        ${stampUrl
          ? `<img src="${escapeHtml(stampUrl)}" alt="Company Stamp" onerror="this.style.display='none'" />`
          : `<div class="line"></div>`}
        <div class="lbl">Company Stamp</div>
      </div>
      <div class="sig">
        <div class="line"></div>
        <div class="lbl">Authorized Signature</div>
      </div>
    </div>
    <div class="foot-text">
      <div class="co">${escapeHtml(companyName)}</div>
      ${phone || email ? `<div class="sub">Phone: ${escapeHtml(phone)} | Email: ${escapeHtml(email)}</div>` : ''}
      <div class="thanks">Thank you for your business!</div>
    </div>
  </footer>
</div>
<div class="no-print" style="text-align:center;margin:16px 0">
  <button onclick="window.print()" style="padding:10px 22px;background:#111827;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Print Receipt</button>
</div>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/*  THERMAL RECEIPT — 80mm with QR code                              */
/* ------------------------------------------------------------------ */
async function buildThermalReceipt(
  sale: SaleReceiptData,
  companyName: string,
  address: string,
  phone: string,
  logoUrl: string | null
): Promise<string> {
  const subtotal = (sale.totalAmount || 0) - (sale.taxAmount || 0);
  const totalItems = (sale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  // Inline QR code (SVG) encoding the sale id + total for verification.
  let qrSvg = '';
  try {
    qrSvg = await QRCode.toString(
      JSON.stringify({ id: sale.id, total: sale.totalAmount, date: sale.date }),
      { type: 'svg', margin: 0, width: 120 }
    );
  } catch {
    qrSvg = '';
  }

  const inst = sale.installmentInfo;
  const isInst = sale.isInstallment && inst;

  const paidAmount = isInst ? inst!.installmentAmount * inst!.paidInstallments : 0;
  const remainingAmount = isInst ? inst!.installmentAmount * inst!.remainingInstallments : 0;
  const productNames = (sale.items || []).map(i => escapeHtml(i.productName)).join(', ');
  const totalQty = (sale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  if (isInst) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Installment Receipt #${sale.invoiceNumber}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Courier New', monospace; color:#000; background:#fff; }
  .receipt { width:74mm; margin:0 auto; padding:4px 2px; font-size:12px; }
  .center { text-align:center; }
  .logo { text-align:center; margin-bottom:4px; }
  .logo img { max-width:40mm; max-height:15mm; object-fit:contain; }
  .name { font-size:16px; font-weight:700; }
  .muted { font-size:10px; color:#444; }
  .sep { border-top:1px dashed #000; margin:6px 0; }
  .row { display:flex; justify-content:space-between; margin:2px 0; font-size:11px; }
  .row .lbl { color:#555; }
  .row .val { font-weight:700; }
  .amounts { margin-top:6px; padding-top:6px; border-top:2px solid #000; }
  .amounts .row { margin:3px 0; font-size:12px; }
  .amounts .row.total { border-top:1px dashed #000; margin-top:4px; padding-top:4px; font-weight:700; font-size:14px; }
  .no-print { text-align:center; margin-top:10px; }
  .no-print button { padding:8px 16px; font-size:13px; cursor:pointer; }
  @media print { .no-print { display:none; } }
</style></head>
<body>
<div class="receipt">
  <div class="center">
    ${logoUrl ? `<div class="logo"><img src="${escapeHtml(logoUrl)}" alt="Logo" onerror="this.style.display='none'" /></div>` : ''}
    <div class="name">${escapeHtml(companyName)}</div>
    ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ''}
    ${phone ? `<div class="muted">Tel: ${escapeHtml(phone)}</div>` : ''}
  </div>
  <div class="sep"></div>
  <div class="center muted">INSTALLMENT RECEIPT</div>
  <div class="sep"></div>

  <div class="row"><span class="lbl">No:</span><span class="val">${sale.invoiceNumber}</span></div>
  <div class="row"><span class="lbl">Date:</span><span class="val">${escapeHtml(fmtDate(sale.date))}</span></div>
  <div class="row"><span class="lbl">Customer:</span><span class="val">${escapeHtml(sale.subscriberName || 'Walk-in')}</span></div>
  <div class="row"><span class="lbl">Plan:</span><span class="val">${escapeHtml(inst!.planName)}</span></div>
  <div class="row"><span class="lbl">Pay Method:</span><span class="val" style="text-transform:uppercase">${escapeHtml(sale.paymentMethod || '')}</span></div>
  <div class="row"><span class="lbl">Products:</span><span class="val" style="max-width:55mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${productNames || '---'}</span></div>
  <div class="row"><span class="lbl">Total Items:</span><span class="val">${totalQty}</span></div>

  <div class="amounts">
    <div class="row"><span class="lbl">Per Installment:</span><span class="val">PKR ${formatPKR(inst!.installmentAmount)}</span></div>
    <div class="row"><span class="lbl">Total Installments:</span><span class="val">${inst!.totalInstallments}</span></div>
    <div class="row"><span class="lbl">Paid:</span><span class="val">${inst!.paidInstallments} / ${inst!.totalInstallments} (PKR ${formatPKR(paidAmount)})</span></div>
    <div class="row"><span class="lbl">Remaining:</span><span class="val">${inst!.remainingInstallments} / ${inst!.totalInstallments} (PKR ${formatPKR(remainingAmount)})</span></div>
    <div class="row total"><span>TOTAL (PER INSTALLMENT):</span><span>PKR ${formatPKR(inst!.installmentAmount)}</span></div>
  </div>

  <div class="sep"></div>
  <div class="center muted">Thank you for your purchase!</div>
  <div class="no-print"><button onclick="window.print()">Print</button></div>
</div>
</body></html>`;
  }

  // ── REGULAR THERMAL ──
  const itemRows = (sale.items || [])
    .map(
      (item) => `
      <div class="line">
        <div class="line-top">
          <span class="desc">${escapeHtml(item.productName)}</span>
          <span class="amt">${formatPKR(item.price * item.quantity)}</span>
        </div>
        <div class="line-bot">
          <span>${item.quantity} x ${formatPKR(item.price)}</span>
          ${item.serialNumber ? `<span style="float:right">${escapeHtml(item.serialNumber)}</span>` : ''}
        </div>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Receipt #${sale.invoiceNumber}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Courier New', monospace; color:#000; background:#fff; }
  .receipt { width:74mm; margin:0 auto; padding:4px 2px; font-size:12px; }
  .center { text-align:center; }
  .logo { text-align:center; margin-bottom:4px; }
  .logo img { max-width:40mm; max-height:15mm; object-fit:contain; }
  .name { font-size:16px; font-weight:700; }
  .muted { font-size:10px; color:#444; }
  .sep { border-top:1px dashed #000; margin:6px 0; }
  .line { margin:3px 0; }
  .line-top { display:flex; justify-content:space-between; }
  .line-bot { font-size:10px; color:#444; }
  .row { display:flex; justify-content:space-between; margin:2px 0; }
  .grand { border-top:1px dashed #000; margin-top:4px; padding-top:4px; font-weight:700; font-size:15px; }
  .qr { text-align:center; margin-top:8px; }
  .qr svg { width:120px; height:120px; }
  .no-print { text-align:center; margin-top:10px; }
  .no-print button { padding:8px 16px; font-size:13px; cursor:pointer; }
  @media print { .no-print { display:none; } }
</style></head>
<body>
<div class="receipt">
  <div class="center">
    ${logoUrl ? `<div class="logo"><img src="${escapeHtml(logoUrl)}" alt="Logo" onerror="this.style.display='none'" /></div>` : ''}
    <div class="name">${escapeHtml(companyName)}</div>
    ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ''}
    ${phone ? `<div class="muted">Tel: ${escapeHtml(phone)}</div>` : ''}
  </div>
  <div class="sep"></div>
  <div class="center muted">SALE RECEIPT</div>
  <div class="sep"></div>
  <div class="row"><span>No:</span><span>${sale.invoiceNumber}</span></div>
  <div class="row"><span>Date:</span><span>${escapeHtml(fmtDate(sale.date))}</span></div>
  <div class="row"><span>Cust:</span><span>${escapeHtml(sale.subscriberName || 'Walk-in')}</span></div>
  <div class="row"><span>Pay:</span><span style="text-transform:uppercase">${escapeHtml(sale.paymentMethod || '')}</span></div>
  <div class="sep"></div>
  ${itemRows || '<div class="muted center">No items</div>'}
  <div class="sep"></div>
  <div class="row"><span>Total Items</span><span>${totalItems}</span></div>
  <div class="row"><span>Subtotal</span><span>PKR ${formatPKR(subtotal)}</span></div>
  <div class="row"><span>Tax</span><span>PKR ${formatPKR(sale.taxAmount)}</span></div>
  <div class="row grand"><span>TOTAL</span><span>PKR ${formatPKR(sale.totalAmount)}</span></div>
  <div class="qr">${qrSvg}</div>
  <div class="center muted" style="margin-top:4px">Scan to verify</div>
  <div class="sep"></div>
  <div class="center muted">Thank you for your purchase!</div>
  <div class="no-print"><button onclick="window.print()">Print</button></div>
</div>
</body></html>`;
}
