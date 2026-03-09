'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { OLT } from '@/lib/types';
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
    onEdit: (olt: OLT) => void;
    onDelete: (olt: OLT) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<OLT>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'location',
    header: 'Location',
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
  },
  {
    accessorKey: 'ports',
    header: 'Total Ports',
    cell: ({ row }) => <div className="text-center">{row.original.ports}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const olt = row.original;
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
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(olt)}>Edit OLT</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(olt)}>
                Delete OLT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
