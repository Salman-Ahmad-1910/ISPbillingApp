'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { LedgerEntry } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnsProps {
    onEdit: (entry: LedgerEntry) => void;
    onDelete: (entry: LedgerEntry) => void;
}


export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<LedgerEntry>[] => [
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'debit',
    header: 'Debit (PKR)',
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue('debit'));
        if (amount === 0) return <div className="text-right">-</div>;
        const formatted = new Intl.NumberFormat('en-US').format(amount);
        return <div className="text-right text-red-600">{formatted}</div>;
    }
  },
  {
    accessorKey: 'credit',
    header: 'Credit (PKR)',
     cell: ({ row }) => {
        const amount = parseFloat(row.getValue('credit'));
        if (amount === 0) return <div className="text-right">-</div>;
        const formatted = new Intl.NumberFormat('en-US').format(amount);
        return <div className="text-right text-green-600">{formatted}</div>;
    }
  },
    {
    accessorKey: 'balance',
    header: 'Balance (PKR)',
     cell: ({ row }) => {
        const amount = parseFloat(row.getValue('balance'));
        const formatted = new Intl.NumberFormat('en-US').format(amount);
        return <div className="text-right font-medium">{formatted}</div>;
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const entry = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(entry)}>Edit Entry</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(entry)}>
                Delete Entry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
