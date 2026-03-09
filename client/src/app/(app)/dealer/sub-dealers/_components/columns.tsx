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

interface SubDealerColumnsProps {
  onEdit: (dealer: Dealer) => void;
  onDelete: (dealer: Dealer) => void;
}

export const getColumns = ({ onEdit, onDelete }: SubDealerColumnsProps): ColumnDef<Dealer>[] => [
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
    header: 'Commission (%)',
    cell: ({ row }) => <div className="text-center">{row.original.commissionRate}%</div>,
  },
  {
    accessorKey: 'walletBalance',
    header: 'Wallet Balance (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('walletBalance'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
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
              {/* <DropdownMenuItem>View details</DropdownMenuItem> */}
              <DropdownMenuItem onClick={() => onEdit(dealer)}>Edit Sub-Dealer</DropdownMenuItem>
              {/* <DropdownMenuSeparator /> */}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(dealer)}>
                Remove Sub-Dealer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
