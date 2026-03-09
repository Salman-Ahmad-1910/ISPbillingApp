'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Splitter } from '@/lib/types';
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
import { Progress } from '@/components/ui/progress';

interface ColumnsProps {
    onEdit: (splitter: Splitter) => void;
    onDelete: (splitter: Splitter) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Splitter>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'location',
    header: 'Location',
  },
  {
    accessorKey: 'oltId',
    header: 'OLT ID',
  },
  {
    accessorKey: 'totalPorts',
    header: 'Total Ports',
    cell: ({ row }) => <div className="text-center">{row.original.totalPorts}</div>,
  },
  {
    accessorKey: 'availablePorts',
    header: 'Available Ports',
    cell: ({ row }) => <div className="text-center">{row.original.availablePorts}</div>,
  },
  {
    header: 'Utilization',
    cell: ({ row }) => {
        if (row.original.totalPorts === 0) {
            return (
                <div className="flex items-center gap-2">
                    <Progress value={0} className="w-24" />
                    <span>0%</span>
                </div>
            )
        }
        const utilization = ((row.original.totalPorts - row.original.availablePorts) / row.original.totalPorts) * 100;
        return (
            <div className="flex items-center gap-2">
                <Progress value={utilization} className="w-24" />
                <span>{utilization.toFixed(0)}%</span>
            </div>
        )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const splitter = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(splitter)}>Edit Splitter</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(splitter)}>
                Delete Splitter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
