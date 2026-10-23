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
  onChangeStatus: (connection: Connection) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
  canChangeStatus?: boolean;
}

function IdBall({ value }: { value: string | number | null | undefined }) {
  const text = String(value ?? '');
  const sizeClass = text.length <= 3 ? 'text-sm' : text.length <= 8 ? 'text-[10px]' : 'text-[8px]';
  return (
    <div
      className={`relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-800 via-green-600 to-green-400 px-1 text-center font-bold leading-tight text-white ring-1 ring-green-900/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.35),0_3px_6px_rgba(0,0,0,0.3)] ${sizeClass}`}
      title={`ID: ${text}`}
    >
      <span className="pointer-events-none absolute left-3 top-1.5 h-2.5 w-2.5 rounded-full bg-white/50 blur-[1px]" aria-hidden />
      <span className="relative break-all drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{text}</span>
    </div>
  );
}

export const getColumns = ({ onEdit, onDelete, onChangeStatus, canUpdate = true, canDelete = true, canChangeStatus = true }: ConnectionColumnsProps): ColumnDef<Connection>[] => [
  {
    accessorKey: 'internetId',
    header: 'Internet ID',
    cell: ({ row }) => <IdBall value={row.original.internetId} />,
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
    cell: ({ row }) => {
      return (
        <div className="text-sm">
          {row.original.packageCable && <div>C: {row.original.packageCable}</div>}
          {row.original.packageInternet && <div>I: {row.original.packageInternet}</div>}
        </div>
      );
    },
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
              {canUpdate && (
              <DropdownMenuItem onClick={() => onEdit(connection)} className="data-[highlighted]:text-emerald-600">Edit subscriber</DropdownMenuItem>
              )}
              {canChangeStatus && (
                <DropdownMenuItem onClick={() => onChangeStatus(connection)} className="data-[highlighted]:text-amber-600">Status</DropdownMenuItem>
              )}
              {canDelete && (
                <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => onDelete(connection)}>
                Delete subscriber
              </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
