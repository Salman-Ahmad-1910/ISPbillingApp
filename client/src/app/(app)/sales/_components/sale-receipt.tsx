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
}

export interface SaleReceiptData {
  id: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  items: SaleReceiptItem[];
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
    ? buildThermalReceipt(sale, companyName, companyAddress, companyPhone)
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
<title>Sale Receipt ${escapeHtml(sale.id)}</title>
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
        Sale ID: <span>${escapeHtml(sale.id)}</span><br/>
        Date: <span>${escapeHtml(fmtDate(sale.date))}</span><br/>
        Status: <span class="status-pill status-${escapeHtml(sale.paymentMethod === 'cash' ? 'paid' : 'pending')}">${escapeHtml((sale.paymentMethod === 'cash' ? 'PAID' : sale.paymentMethod || 'PENDING').toUpperCase())}</span>
      </div>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th class="text-right">Price</th>
        <th class="text-center">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Sale Tax</th>
        <th class="text-right">WTH</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af">No items</td></tr>'}
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
  phone: string
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
        </div>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Receipt ${escapeHtml(sale.id)}</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Courier New', monospace; color:#000; background:#fff; }
  .receipt { width:74mm; margin:0 auto; padding:4px 2px; font-size:12px; }
  .center { text-align:center; }
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
    <div class="name">${escapeHtml(companyName)}</div>
    ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ''}
    ${phone ? `<div class="muted">Tel: ${escapeHtml(phone)}</div>` : ''}
  </div>
  <div class="sep"></div>
  <div class="center muted">SALE RECEIPT</div>
  <div class="sep"></div>
  <div class="row"><span>No:</span><span>${escapeHtml(sale.id)}</span></div>
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
