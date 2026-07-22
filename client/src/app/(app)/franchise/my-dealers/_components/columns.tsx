'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Dealer } from '@/lib/types';
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
  onEdit: (dealer: Dealer) => void;
  onDelete: (dealer: Dealer) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Dealer>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'cnic',
    header: 'CNIC',
  },
  {
    accessorKey: 'commissionRate',
    header: 'Commission',
    cell: ({ row }) => (
      <div className="text-center">{row.original.commissionRate}%</div>
    ),
  },
  {
    accessorKey: 'walletBalance',
    header: 'Wallet Balance',
    cell: ({ row }) => (
      <div className="text-right font-medium">
        PKR {row.original.walletBalance?.toLocaleString() || '0'}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const dealer = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(dealer)} className="data-[highlighted]:text-emerald-600">
                Edit Dealer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(dealer)}>
                Delete Dealer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
