'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Area, Staff } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';

interface ColumnsProps {
  recoveryOfficers: Staff[];
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
  onAssignOfficer: (areaId: string, officerId: string) => void;
}

export const getColumns = ({ recoveryOfficers, onEdit, onDelete, onAssignOfficer }: ColumnsProps): ColumnDef<Area>[] => [
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
    cell: ({ row }) => row.original.subLocality || <span className="text-muted-foreground">N/A</span>
  },
  {
    accessorKey: 'recoveryOfficerId',
    header: 'Assigned Officer',
    cell: ({ row }) => {
      const officer = recoveryOfficers.find(o => o.id === row.original.recoveryOfficerId);
      return officer ? officer.name : <span className="text-muted-foreground">Unassigned</span>;
    }
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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Assign Recovery Officer</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {recoveryOfficers.map(officer => (
                      <DropdownMenuItem key={officer.id} onClick={() => onAssignOfficer(area.id, officer.id)}>{officer.name}</DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
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
