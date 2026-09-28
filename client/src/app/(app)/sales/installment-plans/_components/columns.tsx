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
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const getColumns = ({ onEdit, onDelete, canUpdate = true, canDelete = true }: InstallmentPlanColumnsProps): ColumnDef<InstallmentPlan>[] => [
  {
    accessorKey: 'name',
    header: 'Plan Name',
  },
  {
    accessorKey: 'installments',
    header: 'Installments',
    cell: ({ row }) => <div className="text-center">{row.getValue('installments')}</div>
  },
  {
    accessorKey: 'percentageIncrease',
    header: 'Percentage Increase',
    cell: ({ row }) => {
      const val = Number(row.getValue('percentageIncrease')) || 0;
      return <div className="text-center">{val}%</div>;
    }
  },
  ...(canUpdate || canDelete
    ? [
        {
          id: 'actions',
          cell: ({ row }: { row: { original: InstallmentPlan } }) => {
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
                    {canUpdate && <DropdownMenuItem onClick={() => onEdit(plan)}>Edit plan</DropdownMenuItem>}
                    {canUpdate && canDelete && <DropdownMenuSeparator />}
                    {canDelete && (
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(plan)}>
                        Delete plan
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        } as ColumnDef<InstallmentPlan>,
      ]
    : []),
];
