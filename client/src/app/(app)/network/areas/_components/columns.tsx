'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Area } from '@/lib/types';
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
    onEdit: (area: Area) => void;
    onDelete: (area: Area) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Area>[] => [
  {
    accessorKey: 'city',
    header: 'City',
  },
  {
    accessorKey: 'zone',
    header: 'Zone',
  },
  {
    accessorKey: 'locality',
    header: 'Locality',
  },
  {
    accessorKey: 'subLocality',
    header: 'Sub-Locality',
     cell: ({row}) => row.original.subLocality || <span className="text-muted-foreground">N/A</span>
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const area = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(area)}>Edit Area</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(area)}>
                Delete Area
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
