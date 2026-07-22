'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Inquiry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
  onEdit: (inquiry: Inquiry) => void;
  onDelete: (inquiry: Inquiry) => void;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'new': 'secondary',
  'follow-up': 'outline',
  'converted': 'default',
  'closed': 'destructive',
};

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Inquiry>[] => [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => (
      <div className="text-xs font-mono text-muted-foreground">
        {row.original.id?.slice(0, 6)}
      </div>
    ),
  },
  {
    accessorKey: 'internetId',
    header: 'Internet ID',
    cell: ({ row }) => row.original.internetId || '-',
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
    cell: ({ row }) => {
      const cell = row.original.cell;
      const mobile = row.original.mobile;
      return <div className="text-xs">{cell || '-'}{mobile ? ` / ${mobile}` : ''}</div>;
    },
  },
  {
    accessorKey: 'connectionType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.connectionType;
      if (!type) return '-';
      const labels: Record<string, string> = { both: 'Both', internet: 'Internet', tv_cable: 'TV Cable' };
      return <Badge variant="outline">{labels[type] || type}</Badge>;
    },
  },
  {
    accessorKey: 'installationDate',
    header: 'Install Date',
    cell: ({ row }) => row.original.installationDate || '-',
  },
  {
    id: 'cableInternet',
    header: 'Cable/Internet',
    cell: ({ row }) => {
      const packageCable = row.original.packageCable;
      const boxNumber = row.original.boxNumber;
      return <div className="text-xs">{packageCable || '-'}{boxNumber ? ` / Box: ${boxNumber}` : ''}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={statusVariant[status] || 'secondary'}>
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
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(inquiry)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(inquiry)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
