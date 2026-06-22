'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { DealerFranchise } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
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
    onEdit: (franchise: DealerFranchise) => void;
    onDelete: (franchise: DealerFranchise) => void;
    onApprove: (franchise: DealerFranchise) => void;
}

export const getColumns = ({ onEdit, onDelete, onApprove }: ColumnsProps): ColumnDef<DealerFranchise>[] => [
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
    header: 'Franchise Name',
  },
  {
    accessorKey: 'contactPerson',
    header: 'Contact Person',
  },
  {
    accessorKey: 'contactPhone',
    header: 'Phone',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={
            status === 'approved' ? 'default' :
            status === 'pending' ? 'secondary' : 'destructive'
          }
          className={status === 'approved' ? 'bg-green-600' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const franchise = row.original;
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
              {franchise.status === 'pending' && (
                 <DropdownMenuItem onClick={() => onApprove(franchise)}>Approve</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(franchise)}>Edit Details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(franchise)}>
                Delete Franchise
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
