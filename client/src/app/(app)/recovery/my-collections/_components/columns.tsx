'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { RecoveryTransaction } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';

interface ColumnsProps {
  onEdit: (transaction: RecoveryTransaction) => void;
  onDelete: (transaction: RecoveryTransaction) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<RecoveryTransaction>[] => [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
        const type = row.original.type;
        return (
            <Badge variant={type === 'credit' ? 'default' : 'secondary'} className={type === 'credit' ? 'bg-green-600' : ''}>
                {type}
            </Badge>
        );
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      const isCredit = row.original.type === 'credit';
      return <div className={`text-right font-medium ${isCredit ? 'text-green-600' : 'text-red-600'}`}>{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const transaction = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(transaction)}>Edit Transaction</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(transaction)}>
                Delete Transaction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
