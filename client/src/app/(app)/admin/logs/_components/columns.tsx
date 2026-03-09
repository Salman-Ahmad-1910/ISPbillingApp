'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { SystemLog } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<SystemLog>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
  },
  {
    accessorKey: 'user',
    header: 'User',
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => <Badge variant="secondary">{row.original.action}</Badge>,
  },
  {
    accessorKey: 'details',
    header: 'Details',
  },
];
