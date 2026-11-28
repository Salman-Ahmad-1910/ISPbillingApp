'use client';

// Partial (item) returns on the Sales page:
//  - SaleItemsTable      the products of an entry (expanded row)
//  - ReturnItemsDialog   pick items, set quantities, return them
//  - SaleReturnInvoice   what was returned (side panel "Return Invoice" tab)
//  - canReturnItems      whether an entry uses the item return (promise sales,
//                        fiber jointing and dues rows keep the old full return)

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, RotateCcw } from 'lucide-react';

import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ReturnableSaleItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  serialNumber?: string;
  model?: string;
  taxPercent?: number;
}

export interface ReturnableSale {
  id: string;
  subscriberName?: string;
  date?: string;
  status?: string;
  totalAmount: number;
  taxAmount?: number;
  discount?: number;
  isInstallment?: boolean;
  saleType?: string;
  promisePayment?: boolean;
  promiseInfo?: unknown;
  returnedAmount?: number;
  items: ReturnableSaleItem[];
}

interface SaleReturnRecord {
  id: string;
  returnDate: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  returnedByName?: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
    taxAmount: number;
    amount: number;
    serialNumber?: string;
    model?: string;
  }[];
}

const money = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function fmtDateTime(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

function serialsOf(item: { serialNumber?: string }): string[] {
  return String(item.serialNumber || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

/** Entries that use the item return. Others keep the old full-return confirm. */
export function canReturnItems(sale: ReturnableSale): boolean {
  return (sale.items || []).length > 0
    && !sale.promiseInfo
    && !sale.promisePayment
    && sale.saleType !== 'fiber_jointing'
    && !sale.isInstallment
    && !['hold', 'returned', 'replaced'].includes(String(sale.status || ''));
}

/** The products of one entry, shown when the row's arrow is opened. */
export function SaleItemsTable({ sale }: { sale: ReturnableSale }) {
  const items = sale.items || [];
  const returned = Number(sale.returnedAmount) || 0;
  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>SN / MAC</TableHead>
            <TableHead>Model</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="py-4 text-center text-muted-foreground">No products left in this entry.</TableCell></TableRow>
          ) : items.map((item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-right">{qty}</TableCell>
                <TableCell className="text-right">PKR {money(price)}</TableCell>
                <TableCell className="text-right">PKR {money(price * qty)}</TableCell>
                <TableCell className="font-mono text-xs">{serialsOf(item).join(', ') || '—'}</TableCell>
                <TableCell className="text-xs text-sky-700 dark:text-sky-300">{String(item.model || '').trim() || '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {returned > 0 && (
        <p className="text-xs text-orange-700 dark:text-orange-300">
          PKR {money(returned)} of this entry was returned. Open the entry and see the Return Invoice tab for details.
        </p>
      )}
    </div>
  );
}

interface ReturnItemsDialogProps {
  sale: ReturnableSale | null;
  companyId?: string | null;
  onClose: () => void;
  /** Called after a successful return with the server's message. */
  onReturned: (info: { amount: number; allReturned: boolean }) => void;
  onError: (message: string) => void;
}

/**
 * Step 1: click the items being returned, press Select.
 * Step 2: only the selected items remain; set how many pieces of each, press Return.
 */
export function ReturnItemsDialog({ sale, companyId, onClose, onReturned, onError }: ReturnItemsDialogProps) {
  const [step, setStep] = useState<'pick' | 'qty'>('pick');
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const items = sale?.items || [];
  const reset = () => { setStep('pick'); setSelected([]); setQty({}); setSaving(false); };
  const close = () => { if (saving) return; reset(); onClose(); };

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const chosen = items.filter((i) => selected.includes(i.id));

  // A line with serial numbers is returned whole (POS saves one line per SN).
  const fixedQty = (item: ReturnableSaleItem) => serialsOf(item).length > 0;
  const qtyOf = (item: ReturnableSaleItem) => {
    const max = Number(item.quantity) || 1;
    if (fixedQty(item)) return max;
    const v = qty[item.id] ?? 1;
    return Math.min(Math.max(1, v), max);
  };

  // Same calculation as the server (controllers/pos_return_items.go).
  const summary = useMemo(() => {
    if (!sale) return { subtotal: 0, tax: 0, discount: 0, total: 0, newTotal: 0 };
    const itemsSubtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    let subtotal = 0;
    let tax = 0;
    chosen.forEach((item) => {
      const amount = round2((Number(item.price) || 0) * qtyOf(item));
      subtotal += amount;
      tax += round2(amount * (Number(item.taxPercent) || 0) / 100);
    });
    const saleDiscount = Number(sale.discount) || 0;
    const discount = saleDiscount > 0 && itemsSubtotal > 0
      ? Math.min(saleDiscount, round2(saleDiscount * subtotal / itemsSubtotal))
      : 0;
    const total = round2(subtotal + tax - discount);
    return { subtotal: round2(subtotal), tax: round2(tax), discount, total, newTotal: Math.max(0, round2((Number(sale.totalAmount) || 0) - total)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale, chosen.length, selected, qty]);

  const submit = async () => {
    if (!sale || chosen.length === 0) return;
    setSaving(true);
    try {
      const res = await api.post(
        `/pos/sales/${sale.id}/return-items`,
        { items: chosen.map((item) => ({ saleItemId: item.id, quantity: qtyOf(item) })) },
        { params: companyId ? { companyId } : undefined },
      );
      const updated = res.data?.data?.sale;
      const amount = Number(res.data?.data?.return?.totalAmount) || summary.total;
      reset();
      onReturned({ amount, allReturned: updated?.status === 'returned' });
    } catch (error: any) {
      setSaving(false);
      onError(error?.response?.data?.message || error?.message || 'Failed to return the items');
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 p-1.5 text-white shadow-sm">
              <RotateCcw className="h-4 w-4" />
            </div>
            Return Items
          </DialogTitle>
          <DialogDescription>
            {step === 'pick'
              ? 'Click the items the customer is returning, then press Select.'
              : 'Enter how many pieces of each item are returned, then press Return.'}
            {sale && <> · {sale.subscriberName || 'Walk-in'}{sale.date ? ` · ${new Date(sale.date).toLocaleDateString()}` : ''}</>}
          </DialogDescription>
        </DialogHeader>

        {step === 'pick' ? (
          <div className="space-y-2">
            {items.map((item) => {
              const isOn = selected.includes(item.id);
              const sns = serialsOf(item);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${isOn ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-muted/50'}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isOn ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40'}`}>
                    {isOn && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.productName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {sns.length > 0 ? <span className="font-mono">SN: {sns.join(', ')}</span> : 'No serial number'}
                      {item.model ? ` · Model: ${item.model}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block">{item.quantity} × PKR {money(item.price)}</span>
                    <span className="block text-xs text-muted-foreground">PKR {money((Number(item.price) || 0) * (Number(item.quantity) || 0))}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="w-28">Return Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chosen.map((item) => {
                  const max = Number(item.quantity) || 1;
                  const sns = serialsOf(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        {sns.length > 0 && <div className="font-mono text-xs text-muted-foreground">SN: {sns.join(', ')}</div>}
                      </TableCell>
                      <TableCell className="text-right">{max}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={max}
                          value={qtyOf(item)}
                          disabled={fixedQty(item) || max === 1}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setQty((cur) => ({ ...cur, [item.id]: isNaN(v) ? 1 : v }));
                          }}
                          className="h-8"
                        />
                        {fixedQty(item) && max > 1 && <p className="mt-0.5 text-[10px] text-muted-foreground">Returned whole (serial numbers)</p>}
                      </TableCell>
                      <TableCell className="text-right">PKR {money((Number(item.price) || 0) * qtyOf(item))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="space-y-1.5 rounded-lg border p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Items amount</span><span>PKR {money(summary.subtotal)}</span></div>
              {summary.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>PKR {money(summary.tax)}</span></div>}
              {summary.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount share</span><span>- PKR {money(summary.discount)}</span></div>}
              <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Return amount</span><span className="text-orange-700 dark:text-orange-300">PKR {money(summary.total)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Entry total after return</span><span>PKR {money(summary.newTotal)}</span></div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 sm:justify-end">
          {step === 'pick' ? (
            <>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => setStep('qty')} disabled={selected.length === 0}>
                Select{selected.length > 0 ? ` (${selected.length})` : ''}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('pick')} disabled={saving}>Back</Button>
              <Button variant="destructive" onClick={submit} disabled={saving || chosen.length === 0} className="min-w-28">
                {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Returning...</> : 'Return'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Return Invoice" tab of the side panel: everything returned from this entry. */
export function SaleReturnInvoice({ sale, companyId }: { sale: ReturnableSale; companyId?: string | null }) {
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['pos/sales/returns', sale.id, Number(sale.returnedAmount) || 0, sale.status],
    queryFn: async () => {
      const res = await api.get(`/pos/sales/${sale.id}/returns`, { params: companyId ? { companyId } : undefined });
      return (res.data?.data ?? []) as SaleReturnRecord[];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Returned in full with the old Return (no item records): the whole entry came back.
  if (returns.length === 0 && sale.status === 'returned') {
    return (
      <div className="space-y-3 px-5 py-4 text-sm">
        <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Whole sale returned</Badge>
        <SaleItemsTable sale={{ ...sale, returnedAmount: 0 }} />
        <div className="flex justify-between border-t pt-2 font-semibold"><span>Returned amount</span><span>PKR {money(sale.totalAmount)}</span></div>
      </div>
    );
  }

  if (returns.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing has been returned from this sale.</p>;
  }

  const total = returns.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0)
    + (sale.status === 'returned' ? Number(sale.totalAmount) || 0 : 0);

  return (
    <div className="space-y-4 px-5 py-4 text-sm">
      {returns.map((r, idx) => (
        <div key={r.id} className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between bg-muted/40 px-3.5 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Return #{returns.length - idx}</span>
            <span className="text-xs text-muted-foreground">{fmtDateTime(r.returnDate || r.createdAt)}{r.returnedByName ? ` · ${r.returnedByName}` : ''}</span>
          </div>
          <div className="space-y-1.5 px-3.5 py-2.5">
            {r.items.map((it) => (
              <div key={it.id} className="flex justify-between gap-3">
                <span>
                  <span className="font-medium">{it.productName}</span> × {it.quantity}
                  {serialsOf(it).length > 0 && <span className="block font-mono text-xs text-muted-foreground">SN: {serialsOf(it).join(', ')}</span>}
                </span>
                <span className="shrink-0">PKR {money(it.amount)}</span>
              </div>
            ))}
            <div className="mt-1 space-y-1 border-t pt-1.5">
              {Number(r.taxAmount) > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>PKR {money(r.taxAmount)}</span></div>}
              {Number(r.discount) > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount share</span><span>- PKR {money(r.discount)}</span></div>}
              <div className="flex justify-between font-semibold"><span>Returned</span><span>PKR {money(r.totalAmount)}</span></div>
            </div>
          </div>
        </div>
      ))}
      {sale.status === 'returned' && Number(sale.totalAmount) > 0 && (
        <p className="text-xs text-muted-foreground">The rest of the sale (PKR {money(sale.totalAmount)}) was returned in full afterwards.</p>
      )}
      <div className="flex justify-between rounded-lg border px-3.5 py-2 font-bold">
        <span>Total returned</span>
        <span className="text-orange-700 dark:text-orange-300">PKR {money(total)}</span>
      </div>
    </div>
  );
}
