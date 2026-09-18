'use client';

import { History } from 'lucide-react';

export interface QuantityHistoryRow {
  key: string;
  dateTime: string;
  productName: string;
  quantityBefore: number;
  quantityAdded: number;
  unitPrice: number;
  serials: string;
  models: string;
}

const fmtMoney = (n?: number) =>
  n == null ? '—' : `PKR ${new Intl.NumberFormat('en-US').format(n)}`;

function formatDateTime(raw: string | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function QuantityHistoryTable({ rows }: { rows: QuantityHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-1 text-xs text-muted-foreground">No quantity entries found.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border/60 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Added quantity entries ({rows.length})
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-1 pr-2 font-medium">#</th>
            <th className="py-1 pr-2 font-medium">Date & Time</th>
            <th className="py-1 pr-2 font-medium">Product</th>
            <th className="py-1 pr-2 font-medium text-right">Qty Added</th>
            <th className="py-1 pr-2 font-medium text-right">Qty Before</th>
            <th className="py-1 pr-2 font-medium text-right">Unit Price</th>
            <th className="py-1 pr-2 font-medium">Serials Added</th>
            <th className="py-1 pr-2 font-medium">Models Added</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="py-1 pr-2 font-mono text-muted-foreground">{i + 1}</td>
              <td className="py-1 pr-2 whitespace-nowrap font-medium">{formatDateTime(r.dateTime)}</td>
              <td className="py-1 pr-2 font-medium">{r.productName}</td>
              <td className="py-1 pr-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">+{r.quantityAdded}</td>
              <td className="py-1 pr-2 text-right">{r.quantityBefore}</td>
              <td className="py-1 pr-2 text-right">{fmtMoney(r.unitPrice)}</td>
              <td className="py-1 pr-2 font-mono">{r.serials || '—'}</td>
              <td className="py-1 pr-2 text-sky-700 dark:text-sky-300">{r.models || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}