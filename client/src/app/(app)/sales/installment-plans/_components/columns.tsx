'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { InstallmentPlan } from '@/lib/types';
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

interface InstallmentPlanColumnsProps {
  onEdit: (plan: InstallmentPlan) => void;
  onDelete: (plan: InstallmentPlan) => void;
}

export const getColumns = ({ onEdit, onDelete }: InstallmentPlanColumnsProps): ColumnDef<InstallmentPlan>[] => [
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
    header: 'Plan Name',
  },
  {
    accessorKey: 'productName',
    header: 'Product',
  },
  {
    accessorKey: 'downPayment',
    header: 'Down Payment (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('downPayment'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right">{formatted}</div>;
    },
  },
  {
    accessorKey: 'installments',
    header: 'Installments',
    cell: ({ row }) => <div className="text-center">{row.getValue('installments')}</div>
  },
  {
    accessorKey: 'installmentAmount',
    header: 'Installment Amount (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('installmentAmount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right">{formatted}</div>;
    },
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const plan = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(plan)}>Edit plan</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(plan)}>
                Delete plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
