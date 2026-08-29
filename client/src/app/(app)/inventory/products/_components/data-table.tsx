'use client';

import type { ReactNode } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { ExpandableDataTable } from '@/components/shared/expandable-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowCanExpand?: (row: TData) => boolean;
  renderExpanded?: (row: TData) => ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowCanExpand,
  renderExpanded,
}: DataTableProps<TData, TValue>) {
  return (
    <ExpandableDataTable
      columns={columns}
      data={data}
      getRowCanExpand={getRowCanExpand}
      renderExpanded={renderExpanded}
    />
  );
}