'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { RecoveryOfficer } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';

interface RecoveryOfficerColumnsProps {
  onEdit: (officer: RecoveryOfficer) => void;
  onDelete: (officer: RecoveryOfficer) => void;
}

export const getColumns = ({ onEdit, onDelete }: RecoveryOfficerColumnsProps): ColumnDef<RecoveryOfficer>[] => [
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
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Primary Phone',
  },
  {
    accessorKey: 'secondaryPhone',
    header: 'Secondary Phone',
    cell: ({ row }) => {
      const phone = row.getValue('secondaryPhone') as string;
      return <div>{phone || '-'}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const officer = row.original;
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
              {/* <Link href={`/admin/recovery-officers/${officer.id}`}>
                <DropdownMenuItem>View details</DropdownMenuItem>
              </Link> */}
              <DropdownMenuItem onClick={() => onEdit(officer)}>Edit officer</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(officer)}>
                Delete officer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
