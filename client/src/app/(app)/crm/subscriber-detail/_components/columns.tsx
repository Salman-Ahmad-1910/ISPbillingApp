'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Connection } from '@/lib/types';
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

interface ConnectionColumnsProps {
  onEdit: (connection: Connection) => void;
  onDelete: (connection: Connection) => void;
}

export const getColumns = ({ onEdit, onDelete }: ConnectionColumnsProps): ColumnDef<Connection>[] => [
  {
    accessorKey: 'internetId',
    header: 'Internet ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">{row.original.address}</div>
    ),
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.cell && <div>{row.original.cell}</div>}
        {row.original.mobile && <div className="text-muted-foreground">{row.original.mobile}</div>}
      </div>
    ),
  },
  {
    accessorKey: 'connectionType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.connectionType;
      const labels: Record<string, string> = { both: 'Both', internet: 'Internet', tv_cable: 'Cable' };
      return <div>{labels[type] || type}</div>;
    },
  },
  {
    accessorKey: 'installationDate',
    header: 'Install Date',
  },
  {
    id: 'cableInternet',
    header: 'Cable / Internet',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.packageCable && <div>C: {row.original.packageCable}</div>}
        {row.original.packageInternet && <div>I: {row.original.packageInternet}</div>}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const statusStyles: Record<string, string> = {
        active: 'text-green-600',
        inactive: 'text-gray-500',
        deactivated: 'text-red-600',
        suspended: 'text-amber-600',
      };
      return (
        <div className={`text-sm font-medium ${statusStyles[status] || 'text-gray-500'}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const connection = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(connection)} className="data-[highlighted]:text-emerald-600">Edit subscriber</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(connection)}>
                Delete subscriber
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
