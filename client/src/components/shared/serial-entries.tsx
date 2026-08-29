'use client';

import { Hash } from 'lucide-react';

// Consistent SN parsing used everywhere: serial numbers are stored as a single
// text field separated by spaces, commas or dashes.
export function parseSerialNumbers(raw?: string | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[\s,\-]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SerialEntry {
  key: string;
  productName: string;
  serialNumber: string;
  price?: number;
  extra?: string;
}

const fmt = (n?: number) =>
  n == null ? '—' : `PKR ${new Intl.NumberFormat('en-US').format(n)}`;

export function SerialEntriesTable({ entries }: { entries: SerialEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-1 text-xs text-muted-foreground">No serial numbers.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border/60 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Hash className="h-3.5 w-3.5" />
        Serial entries ({entries.length})
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-1 pr-2 font-medium">#</th>
            <th className="py-1 pr-2 font-medium">Product</th>
            <th className="py-1 pr-2 font-medium">SN / MAC</th>
            <th className="py-1 pr-2 font-medium text-right">Price</th>
            {entries.some((e) => e.extra) && (
              <th className="py-1 pr-2 font-medium text-right">Qty</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.key} className="border-b last:border-0">
              <td className="py-1 pr-2 font-mono text-muted-foreground">
                {i + 1}
              </td>
              <td className="py-1 pr-2 font-medium">{e.productName}</td>
              <td className="py-1 pr-2 font-mono">{e.serialNumber}</td>
              <td className="py-1 pr-2 text-right">{fmt(e.price)}</td>
              {entries.some((x) => x.extra) && (
                <td className="py-1 pr-2 text-right">{e.extra}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}