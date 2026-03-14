'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Vendor } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VendorColumnsProps {
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
}

export const columns = ({ onEdit, onDelete }: VendorColumnsProps): ColumnDef<Vendor>[] => [
  {
    accessorKey: 'id',
    header: 'Vendor ID',
    cell: ({ row }) => {
      const id = row.getValue('id') as string;
      return <span className="text-muted-foreground text-xs">{id.slice(0, 8)}...</span>;
    },
  },
  {
    accessorKey: 'name',
    header: 'Vendor Name',
    cell: ({ row }) => {
      const name = row.original.name;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    accessorKey: 'contactPerson',
    header: 'Contact Person',
    cell: ({ row }) => {
      const contactPerson = row.original.contactPerson;
      return contactPerson ? <span>{contactPerson}</span> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.original.phone;
      return phone ? (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          <span>{phone}</span>
        </div>
      ) : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.original.email;
      return email ? (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          <span className="text-sm">{email}</span>
        </div>
      ) : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => {
      const address = row.original.address;
      return address ? (
        <div className="flex items-start gap-1 max-w-xs">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="text-sm truncate">{address}</span>
        </div>
      ) : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const vendor = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(vendor)}>Edit vendor</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(vendor)}>
                Delete vendor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
