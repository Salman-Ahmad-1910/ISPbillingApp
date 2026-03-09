'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Inquiry } from '@/lib/types';
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
  onEdit: (inquiry: Inquiry) => void;
  onDelete: (inquiry: Inquiry) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Inquiry>[] => [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
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
    accessorKey: 'address',
    header: 'Address',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === 'converted' ? 'default' : 'secondary'}
          className={status === 'converted' ? 'bg-green-600' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const inquiry = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(inquiry)}>Edit Inquiry</DropdownMenuItem>
              <DropdownMenuItem>Follow Up</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Convert to Subscriber</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(inquiry)}>
                Delete Inquiry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
