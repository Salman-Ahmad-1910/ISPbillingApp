'use client';

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/subscriber-report-types';
import type { InvoiceColumn } from '@/components/shared/subscriber-report-print';

export interface InternetPackageRow {
  id: string;
  connectionId?: string;
  billNo?: string | number;
  internetId?: string;
  name: string;
  address?: string;
  amount: number;
  receivingDate?: string;
  receivedBy?: string;
  packageAmount?: number;
}

export const INTERNET_PACKAGE_HEADERS = ['Bill#', 'ID', 'Name', 'Address', 'Amount', 'Receiving Date', 'Receive By', 'Internet Package Amount', 'Profit'];

export function internetPackageProfit(row: InternetPackageRow): number {
  return (Number(row.amount) || 0) - (Number(row.packageAmount) || 0);
}

export function internetPackageInvoiceColumns(): InvoiceColumn<InternetPackageRow>[] {
  return [
    { header: 'Bill#', render: (r) => (r.billNo ? String(r.billNo) : '-') },
    { header: 'ID', render: (r) => r.internetId || '-' },
    { header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
    { header: 'Address', render: (r) => r.address || '-' },
    { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
    { header: 'Receiving Date', render: (r) => formatDateTime(r.receivingDate) },
    { header: 'Receive By', render: (r) => r.receivedBy || '-' },
    { header: 'Internet Package Amount (PKR)', align: 'right', render: (r) => (Number(r.packageAmount) || 0).toLocaleString() },
    { header: 'Profit (PKR)', align: 'right', render: (r) => internetPackageProfit(r).toLocaleString() },
  ];
}

export function internetPackageExcel(rows: InternetPackageRow[]): { headers: string[]; rows: (string | number)[][] } {
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPackage = rows.reduce((s, r) => s + (Number(r.packageAmount) || 0), 0);
  const totalProfit = totalAmount - totalPackage;
  return {
    headers: INTERNET_PACKAGE_HEADERS,
    rows: [
      ...rows.map((r) => [
        r.billNo ? String(r.billNo) : '-',
        r.internetId || '-',
        r.name,
        r.address || '-',
        r.amount.toFixed(2),
        formatDateTime(r.receivingDate),
        r.receivedBy || '-',
        (Number(r.packageAmount) || 0).toFixed(2),
        internetPackageProfit(r).toFixed(2),
      ]),
      ['TOTAL', '', '', '', totalAmount.toFixed(2), '', '', totalPackage.toFixed(2), totalProfit.toFixed(2)],
    ],
  };
}

export default function SubscriberInternetPackageTable({ rows }: { rows: InternetPackageRow[] }) {
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPackage = rows.reduce((s, r) => s + (Number(r.packageAmount) || 0), 0);
  const totalProfit = totalAmount - totalPackage;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bill#</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Receiving Date</TableHead>
          <TableHead>Receive By</TableHead>
          <TableHead>Internet Package Amount</TableHead>
          <TableHead>Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.billNo ? String(item.billNo) : '-'}</TableCell>
            <TableCell className="font-mono text-xs">{item.internetId || '-'}</TableCell>
            <TableCell className="font-medium">
              {item.connectionId ? (
                <Link
                  href={`/crm/subscriber-detail?connectionId=${item.connectionId}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.name}
                </Link>
              ) : (
                <span className="font-medium">{item.name}</span>
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={item.address}>{item.address || '---'}</TableCell>
            <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
            <TableCell className="text-xs">{formatDateTime(item.receivingDate)}</TableCell>
            <TableCell>{item.receivedBy || '---'}</TableCell>
            <TableCell>PKR {(Number(item.packageAmount) || 0).toLocaleString()}</TableCell>
            <TableCell>PKR {internetPackageProfit(item).toLocaleString()}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/50 font-semibold">
          <TableCell colSpan={4} className="font-bold">TOTAL</TableCell>
          <TableCell>PKR {totalAmount.toLocaleString()}</TableCell>
          <TableCell />
          <TableCell />
          <TableCell>PKR {totalPackage.toLocaleString()}</TableCell>
          <TableCell>PKR {totalProfit.toLocaleString()}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
