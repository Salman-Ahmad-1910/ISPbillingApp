'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { CorporateCustomer } from '@/lib/types';
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
  onEdit: (customer: CorporateCustomer) => void;
  onDelete: (customer: CorporateCustomer) => void;
}


export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<CorporateCustomer>[] => [
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
              {/* <DropdownMenuItem>View Details</DropdownMenuItem> */}
              <DropdownMenuItem onClick={() => onEdit(customer)}>Edit Customer</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(customer)}>
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
