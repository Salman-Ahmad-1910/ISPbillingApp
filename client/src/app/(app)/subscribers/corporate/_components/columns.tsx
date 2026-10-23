'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { CorporateCustomer } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnsProps {
  onEdit: (customer: CorporateCustomer) => void;
  onDelete: (customer: CorporateCustomer) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
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

export const getColumns = ({ onEdit, onDelete, canUpdate = true, canDelete = true }: ColumnsProps): ColumnDef<CorporateCustomer>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <IdBall value={row.original.customerId} />,
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
          {canUpdate && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(customer)}>
            <Pencil className="h-4 w-4" />
          </Button>
          )}
          {canDelete && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(customer)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          )}
        </div>
      );
    },
  },
];
