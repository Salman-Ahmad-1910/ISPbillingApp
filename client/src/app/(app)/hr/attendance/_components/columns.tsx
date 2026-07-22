'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Attendance } from '@/lib/types';
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
  onEdit: (attendance: Attendance) => void;
  onDelete: (attendance: Attendance) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Attendance>[] => [
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
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'staffName',
    header: 'Staff Name',
  },
  {
    accessorKey: 'checkIn',
    header: 'Check-in',
  },
  {
    accessorKey: 'checkOut',
    header: 'Check-out',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
      if (status === 'present') variant = 'default';
      if (status === 'absent' || status === 'late') variant = 'destructive';

      return (
        <Badge
          variant={variant}
          className={status === 'present' ? 'bg-green-600' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const attendance = row.original;
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
              <DropdownMenuItem className="data-[highlighted]:text-emerald-600" onClick={() => onEdit(attendance)}>Edit Entry</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(attendance)}>Delete Entry</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
