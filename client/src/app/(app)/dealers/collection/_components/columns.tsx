'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { DealerCollection } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, FileText, Copy, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CollectionActions {
  onEdit: (col: DealerCollection) => void;
  onDelete: (id: string) => void;
  onPrint: (col: DealerCollection, format: 'a4' | 'thermal') => void;
  onToggleStatus: (col: DealerCollection) => void;
}

export function getColumns(actions: CollectionActions): ColumnDef<DealerCollection>[] {
  return [
    {
      accessorKey: 'id',
      header: 'Bill #',
      cell: ({ row }) => (
        <div className="text-xs font-mono text-muted-foreground">
          {row.original.id.slice(0, 8).toUpperCase()}
        </div>
      ),
    },
    {
      accessorKey: 'dealerId',
      header: 'Dealer ID',
      cell: ({ row }) => (
        <div className="text-xs font-mono">
          {row.original.dealerId?.slice(0, 8) || '---'}
        </div>
      ),
    },
    {
      accessorKey: 'dealerName',
      header: 'Name',
    },
    {
      accessorKey: 'dealerAddress',
      header: 'Address',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground max-w-[150px] truncate">
          {row.original.dealerAddress || '---'}
        </div>
      ),
    },
    {
      accessorKey: 'collectionDate',
      header: 'Pay Date',
    },
    {
      accessorKey: 'transactionType',
      header: 'Payment Type',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.transactionType || 'cash'}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount (PKR)',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount'));
        const formatted = new Intl.NumberFormat('en-US').format(amount);
        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: 'comment',
      header: 'Comment',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground max-w-[120px] truncate">
          {row.original.comment || '---'}
        </div>
      ),
    },
    {
      accessorKey: 'settlementStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.settlementStatus;
        return (
          <Badge
            variant={status === 'settled' ? 'default' : 'secondary'}
            className={status === 'settled' ? 'bg-green-600' : ''}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'receivedByName',
      header: 'Received By',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const col = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => actions.onEdit(col)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onToggleStatus(col)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  {col.settlementStatus === 'settled' ? 'Mark Unpaid' : 'Mark Paid'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onPrint(col, 'a4')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Print Bill
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onPrint(col, 'thermal')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Print
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => actions.onDelete(col.id)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export const columns: ColumnDef<DealerCollection>[] = [];
