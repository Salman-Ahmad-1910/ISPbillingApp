'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Guarantor } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GuarantorColumnsProps {
  onEdit: (guarantor: Guarantor) => void;
  onDelete: (guarantor: Guarantor) => void;
}

export const getColumns = ({ onEdit, onDelete }: GuarantorColumnsProps): ColumnDef<Guarantor>[] => [
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
    accessorKey: 'cnic',
    header: 'CNIC',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const guarantor = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(guarantor)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(guarantor)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
