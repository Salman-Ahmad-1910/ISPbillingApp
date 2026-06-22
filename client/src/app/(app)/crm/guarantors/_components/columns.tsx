'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Guarantor } from '@/lib/types';
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
import Link from 'next/link';

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
    // cell: ({ row }) => (
    //   <Link href={`/crm/customers/${row.original.customerId}`} className="text-primary hover:underline">
    //     {row.original.customerName}
    //   </Link>
    // )
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const guarantor = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(guarantor)}>Edit guarantor</DropdownMenuItem>
              {/* <DropdownMenuSeparator /> */}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(guarantor)}>
                Remove guarantor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
