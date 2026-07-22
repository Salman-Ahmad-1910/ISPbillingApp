'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Staff } from '@/lib/types';
import type { Area } from '@/lib/types';
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
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  areas?: Area[];
}

export const getColumns = ({ onEdit, onDelete, areas = [] }: ColumnsProps): ColumnDef<Staff>[] => [
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
    accessorKey: 'designation',
    header: 'Designation',
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.department}</Badge>,
  },
  {
    accessorKey: 'areaId',
    header: 'Area',
    cell: ({ row }) => {
      const areaId = row.getValue('areaId') as string | null;
      if (!areaId) {
        return <Badge variant="secondary">Unassigned</Badge>;
      }
      // Find area by ID and show its name
      const area = areas.find(a => a.id === areaId);
      if (area) {
        return <Badge variant="outline">{area.city} - {area.zone}</Badge>;
      }
      // Fallback to showing ID if area not found
      return <Badge variant="outline">{areaId}</Badge>;
    },
  },
  {
    accessorKey: 'salary',
    header: 'Salary (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('salary'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const staffMember = row.original;
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
              <DropdownMenuItem className="data-[highlighted]:text-emerald-600">View Profile</DropdownMenuItem>
              <DropdownMenuItem className="data-[highlighted]:text-emerald-600" onClick={() => onEdit(staffMember)}>Edit Staff</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(staffMember)}>
                Delete Staff
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
