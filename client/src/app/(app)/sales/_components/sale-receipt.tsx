'use client';

import type { Company } from '@/lib/types';
import QRCode from 'qrcode';

export interface SaleReceiptItem {
  productName: string;
  quantity: number;
  price: number;
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

  return size === 'thermal'
    ? buildThermalReceipt(sale, companyName, companyAddress, companyPhone)
    : buildA4Receipt(sale, companyName, companyAddress, companyPhone, companyEmail);
}

/* ------------------------------------------------------------------ */
/*  A4 RECEIPT — beautified                                           */
/* ------------------------------------------------------------------ */
function buildA4Receipt(
  sale: SaleReceiptData,
  companyName: string,
  address: string,
  phone: string,
  email: string
): string {
  const subtotal = (sale.totalAmount || 0) - (sale.taxAmount || 0);

  const totalItems = (sale.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const itemRows = (sale.items || [])
    .map(
      (item, i) => `
      <tr>
        <td class="col-no">${i + 1}</td>
        <td class="col-desc">${escapeHtml(item.productName)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatPKR(item.price)}</td>
        <td class="num">${formatPKR(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Sale Receipt ${escapeHtml(sale.id)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Segoe UI', Arial, sans-serif; color:#1f2937; background:#f3f4f6; padding:24px; }
  .sheet { width:210mm; min-height:297mm; margin:0 auto; background:#fff; padding:40px 48px; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111827; padding-bottom:18px; }
  .brand .name { font-size:28px; font-weight:800; letter-spacing:-.5px; }
  .brand .meta { font-size:12px; color:#6b7280; margin-top:4px; line-height:1.5; }
  .doc { text-align:right; }
  .doc .title { font-size:22px; font-weight:700; text-transform:uppercase; color:#111827; }
  .doc .rid { font-size:12px; color:#6b7280; margin-top:4px; font-family:monospace; }
  .meta-grid { display:flex; justify-content:space-between; margin:22px 0; gap:24px; }
  .box { flex:1; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; }
  .box .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:#9ca3af; }
  .box .val { font-size:14px; font-weight:600; margin-top:2px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  thead th { background:#111827; color:#fff; font-size:11px; text-transform:uppercase; letter-spacing:.5px; padding:10px 12px; text-align:left; }
  thead th.num { text-align:right; }
  tbody td { padding:11px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  td.num, td.col-no { text-align:right; }
  td.col-no { color:#9ca3af; width:36px; }
  .totals-wrap { display:flex; justify-content:flex-end; margin-top:22px; }
  .totals { width:300px; }
  .totals .row { display:flex; justify-content:space-between; padding:8px 0; font-size:14px; }
  .totals .grand { border-top:3px double #111827; margin-top:6px; padding-top:12px; font-size:20px; font-weight:800; }
  .totals .grand .amt { color:#059669; }
  .foot { margin-top:36px; border-top:1px solid #e5e7eb; padding-top:16px; text-align:center; }
  .foot .thanks { font-size:15px; font-weight:600; }
  .foot .sub { font-size:12px; color:#6b7280; margin-top:4px; }
  .pill { display:inline-block; padding:3px 10px; border-radius:999px; background:#ecfdf5; color:#047857; font-size:11px; font-weight:700; text-transform:uppercase; }
  .no-print { margin-top:16px; text-align:center; }
  .no-print button { padding:10px 22px; background:#111827; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px; }
  @media print { body { background:#fff; padding:0; } .sheet { box-shadow:none; width:auto; min-height:auto; padding:0; } .no-print { display:none; } }
</style></head>
<body>
<div class="sheet">
  <div class="head">
    <div class="brand">
      <div class="name">${escapeHtml(companyName)}</div>
      ${address ? `<div class="meta">${escapeHtml(address)}</div>` : ''}
      ${phone ? `<div class="meta">Tel: ${escapeHtml(phone)}</div>` : ''}
      ${email ? `<div class="meta">${escapeHtml(email)}</div>` : ''}
    </div>
    <div class="doc">
      <div class="title">Sale Receipt</div>
      <div class="rid"># ${escapeHtml(sale.id)}</div>
      <div class="meta" style="margin-top:6px;color:#6b7280;font-size:12px">${escapeHtml(fmtDate(sale.date))}</div>
      <div style="margin-top:6px"><span class="pill">${escapeHtml(sale.paymentMethod || '')}</span></div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="box">
      <div class="lbl">Billed To</div>
      <div class="val">${escapeHtml(sale.subscriberName || 'Walk-in Customer')}</div>
    </div>
    <div class="box">
      <div class="lbl">Payment Method</div>
      <div class="val" style="text-transform:capitalize">${escapeHtml(sale.paymentMethod || '-')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">No items</td></tr>'}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="row"><span>Total Items</span><span>${totalItems}</span></div>
      <div class="row"><span>Subtotal</span><span>PKR ${formatPKR(subtotal)}</span></div>
      <div class="row"><span>Tax</span><span>PKR ${formatPKR(sale.taxAmount)}</span></div>
      <div class="row grand"><span>Total</span><span class="amt">PKR ${formatPKR(sale.totalAmount)}</span></div>
    </div>
  </div>

  <div class="foot">
    <div class="thanks">Thank you for your purchase!</div>
    <div class="sub">This is a computer-generated receipt and does not require a signature.</div>
    <div class="no-print"><button onclick="window.print()">Print Receipt</button></div>
  </div>
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
