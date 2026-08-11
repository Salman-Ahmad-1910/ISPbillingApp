'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';

export interface InvoiceActions {
  onPay: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

export const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const getColumns = (actions: InvoiceActions): ColumnDef<Invoice>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.id.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: 'subscriberName',
    header: 'Subscriber',
    cell: ({ row }) => <div className="font-medium">{row.original.subscriberName || '—'}</div>,
  },
  {
    accessorKey: 'billingPeriod',
    header: 'Billing Period',
    cell: ({ row }) => <div className="whitespace-nowrap">{row.original.billingPeriod || '—'}</div>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <div className="font-medium whitespace-nowrap">PKR {Number(row.original.amount).toLocaleString()}</div>,
  },
  {
    accessorKey: 'paidAmount',
    header: 'Paid',
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-emerald-600 dark:text-emerald-400">
        PKR {Number(row.original.paidAmount || 0).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: 'remainingAmount',
    header: 'Remaining',
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-red-600 dark:text-red-400">
        PKR {Number(row.original.remainingAmount ?? row.original.amount).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => {
      const due = row.original.dueDate;
      if (!due) return <div className="text-muted-foreground">—</div>;
      return <div className="whitespace-nowrap">{due.slice(0, 10)}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || ''}`}>
          {status || 'pending'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const invoice = row.original;
      const unpaid = Number(invoice.remainingAmount ?? invoice.amount) > 0;
      return (
        <div className="flex items-center justify-end gap-1">
          {unpaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.onPay(invoice)}
              className="h-8 gap-1 text-emerald-600 hover:text-emerald-700"
              title="Record payment"
            >
              <Banknote className="h-3.5 w-3.5" />
              Pay
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.onEdit(invoice)}
            className="h-8 gap-1"
            title="View / edit"
          >
            <Eye className="h-3.5 w-3.5" />
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.onDelete(invoice)}
            className="h-8 gap-1 text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    },
  },
];
