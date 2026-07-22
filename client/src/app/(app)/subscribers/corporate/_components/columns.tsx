'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { CorporateCustomer } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
  onEdit: (customer: CorporateCustomer) => void;
  onDelete: (customer: CorporateCustomer) => void;
}


export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<CorporateCustomer>[] => [
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
    accessorKey: 'companyName',
    header: 'Company Name',
  },
  {
    accessorKey: 'contactPerson',
    header: 'Contact Person',
  },
  {
    accessorKey: 'contactPhone',
    header: 'Phone',
  },
  {
    accessorKey: 'totalConnections',
    header: 'Connections',
    cell: ({ row }) => <div className="text-center">{row.original.totalConnections}</div>
  },
  {
    accessorKey: 'contractEndDate',
    header: 'Contract End',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(customer)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(customer)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
