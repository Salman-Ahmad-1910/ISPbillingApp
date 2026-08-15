'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InvoiceColumn } from '@/components/shared/subscriber-report-print';

export interface PackageWiseRow {
  id: string;
  packageName: string;
  subscriberCount: number;
  totalAmount: number;
}

export const PACKAGE_WISE_HEADERS = ['#', 'Package', 'Subscribers', 'Total Amount'];

export function packageWiseInvoiceColumns(): InvoiceColumn<PackageWiseRow>[] {
  return [
    { header: '#', render: (_: PackageWiseRow, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
    { header: 'Package', render: (r) => <span className="font-semibold">{r.packageName}</span> },
    { header: 'Subscribers', align: 'right', render: (r) => <span className="font-bold">{r.subscriberCount}</span> },
    { header: 'Total Amount (PKR)', align: 'right', render: (r) => r.totalAmount.toLocaleString() },
  ];
}

export function packageWiseExcel(rows: PackageWiseRow[]): { headers: string[]; rows: (string | number)[][] } {
  const totalSubs = rows.reduce((s, r) => s + r.subscriberCount, 0);
  const totalAmt = rows.reduce((s, r) => s + r.totalAmount, 0);
  return {
    headers: PACKAGE_WISE_HEADERS,
    rows: [
      ...rows.map((r, i) => [i + 1, r.packageName, r.subscriberCount, r.totalAmount.toFixed(2)]),
      ['', 'TOTAL', totalSubs, totalAmt.toFixed(2)],
    ],
  };
}

export function connectionPackageName(c?: { packageInternet?: string | null; packageCable?: string | null }): string {
  const internet = String(c?.packageInternet || '').trim();
  const cable = String(c?.packageCable || '').trim();
  const isReal = (v: string) => v && v.toLowerCase() !== 'none';
  const first = isReal(internet) ? internet : isReal(cable) ? cable : '';
  return first || 'No Package';
}

export function packageSubscriberCounts(connections: { packageInternet?: string | null; packageCable?: string | null }[]): Map<string, number> {
  const map = new Map<string, number>();
  connections.forEach((c) => {
    const key = connectionPackageName(c);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

export function buildPackageWiseReport(
  counts: Map<string, number>,
  collected: { packageName?: string; amount: number }[]
): PackageWiseRow[] {
  const amounts = new Map<string, number>();
  collected.forEach((item) => {
    const key = item.packageName || 'No Package';
    amounts.set(key, (amounts.get(key) || 0) + (Number(item.amount) || 0));
  });
  const names = new Set<string>([...counts.keys(), ...amounts.keys()]);
  return Array.from(names)
    .map((name) => ({
      id: `package-${name}`,
      packageName: name,
      subscriberCount: counts.get(name) || 0,
      totalAmount: amounts.get(name) || 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export function groupPackages(items: { packageName?: string; subscriberId?: string; connectionId?: string; id: string; amount: number }[]): PackageWiseRow[] {
  const groups = new Map<string, { subscribers: Set<string>; amount: number }>();
  items.forEach((item) => {
    const key = item.packageName || 'No Package';
    const g = groups.get(key) || { subscribers: new Set<string>(), amount: 0 };
    g.subscribers.add(item.subscriberId || item.connectionId || item.id);
    g.amount += Number(item.amount) || 0;
    groups.set(key, g);
  });
  return Array.from(groups.entries())
    .map(([key, g]) => ({ id: `package-${key}`, packageName: key, subscriberCount: g.subscribers.size, totalAmount: g.amount }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export function withPackageInvoiceColumns(): InvoiceColumn<PackageWiseRow>[] {
  return [
    { header: 'ID', render: (_: PackageWiseRow, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
    { header: 'Package Name', render: (r) => <span className="font-semibold">{r.packageName}</span> },
    { header: 'Subscribers', align: 'right', render: (r) => <span className="font-bold">{r.subscriberCount}</span> },
    { header: 'Total Amount (PKR)', align: 'right', render: (r) => r.totalAmount.toLocaleString() },
  ];
}

export function withPackageExcel(rows: PackageWiseRow[]): { headers: string[]; rows: (string | number)[][] } {
  const totalSubs = rows.reduce((s, r) => s + r.subscriberCount, 0);
  const totalAmt = rows.reduce((s, r) => s + r.totalAmount, 0);
  return {
    headers: ['ID', 'Package Name', 'Subscribers', 'Total Amount'],
    rows: [
      ...rows.map((r, i) => [i + 1, r.packageName, r.subscriberCount, r.totalAmount.toFixed(2)]),
      ['', 'TOTAL', totalSubs, totalAmt.toFixed(2)],
    ],
  };
}

export function SubscriberWithPackageTable({ rows }: { rows: PackageWiseRow[] }) {
  const totalSubs = rows.reduce((s, r) => s + r.subscriberCount, 0);
  const totalAmt = rows.reduce((s, r) => s + r.totalAmount, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Package Name</TableHead>
          <TableHead className="text-right">Subscribers</TableHead>
          <TableHead className="text-right">Total Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item, i) => (
          <TableRow key={item.id}>
            <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
            <TableCell className="font-medium">{item.packageName}</TableCell>
            <TableCell className="text-right font-medium">{item.subscriberCount}</TableCell>
            <TableCell className="text-right font-medium">PKR {item.totalAmount.toLocaleString()}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/50 font-semibold">
          <TableCell className="font-bold" colSpan={2}>TOTAL</TableCell>
          <TableCell className="text-right">{totalSubs}</TableCell>
          <TableCell className="text-right">PKR {totalAmt.toLocaleString()}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default function SubscriberPackageWiseTable({ rows }: { rows: PackageWiseRow[] }) {
  const totalSubs = rows.reduce((s, r) => s + r.subscriberCount, 0);
  const totalAmt = rows.reduce((s, r) => s + r.totalAmount, 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Package</TableHead>
          <TableHead className="text-right">Subscribers</TableHead>
          <TableHead className="text-right">Total Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item, i) => (
          <TableRow key={item.id}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="font-medium">{item.packageName}</TableCell>
            <TableCell className="text-right font-medium">{item.subscriberCount}</TableCell>
            <TableCell className="text-right font-medium">PKR {item.totalAmount.toLocaleString()}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/50 font-semibold">
          <TableCell className="font-bold" colSpan={2}>TOTAL</TableCell>
          <TableCell className="text-right">{totalSubs}</TableCell>
          <TableCell className="text-right">PKR {totalAmt.toLocaleString()}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
