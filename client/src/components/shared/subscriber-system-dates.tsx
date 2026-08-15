'use client';

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, paymentChannel } from '@/lib/subscriber-report-types';
import type { InvoiceColumn } from '@/components/shared/subscriber-report-print';

export interface SystemDateRow {
  id: string;
  connectionId?: string;
  billNo?: string | number;
  internetId?: string;
  name: string;
  address?: string;
  amount: number;
  receivingDate?: string;
  systemDate?: string;
  receivedBy?: string;
  method?: string;
}

export const SYSTEM_DATES_HEADERS = ['Bill#', 'ID', 'Name', 'Address', 'Amount', 'Receiving Date', 'System Date', 'Receive By', 'Mobile/Web'];

export function systemDatesInvoiceColumns(): InvoiceColumn<SystemDateRow>[] {
  return [
    { header: 'Bill#', render: (r) => (r.billNo ? String(r.billNo) : '-') },
    { header: 'ID', render: (r) => r.internetId || '-' },
    { header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
    { header: 'Address', render: (r) => r.address || '-' },
    { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
    { header: 'Receiving Date', render: (r) => formatDateTime(r.receivingDate) },
    { header: 'System Date', render: (r) => formatDateTime(r.systemDate) },
    { header: 'Receive By', render: (r) => r.receivedBy || '-' },
    { header: 'Mobile/Web', render: (r) => <span className="capitalize">{paymentChannel(r.method || '')}</span> },
  ];
}

export function systemDatesExcel(rows: SystemDateRow[]): { headers: string[]; rows: (string | number)[][] } {
  return {
    headers: SYSTEM_DATES_HEADERS,
    rows: rows.map((r) => [
      r.billNo ? String(r.billNo) : '-',
      r.internetId || '-',
      r.name,
      r.address || '-',
      r.amount.toFixed(2),
      formatDateTime(r.receivingDate),
      formatDateTime(r.systemDate),
      r.receivedBy || '-',
      paymentChannel(r.method || ''),
    ]),
  };
}

export default function SubscriberSystemDatesTable({ rows }: { rows: SystemDateRow[] }) {
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
          <TableHead>System Date</TableHead>
          <TableHead>Receive By</TableHead>
          <TableHead>Mobile/Web</TableHead>
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
            <TableCell className="text-xs">{formatDateTime(item.systemDate)}</TableCell>
            <TableCell>{item.receivedBy || '---'}</TableCell>
            <TableCell className="capitalize">{paymentChannel(item.method || '')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
