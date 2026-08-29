'use client';

import type { ReactNode } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { ExpandableDataTable } from '@/components/shared/expandable-data-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  getRowCanExpand?: (row: TData) => boolean;
  renderExpanded?: (row: TData) => ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  getRowCanExpand,
  renderExpanded,
}: DataTableProps<TData, TValue>) {
  return (
    <ExpandableDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      getRowCanExpand={getRowCanExpand}
      renderExpanded={renderExpanded}
      pagination
      emptyMessage="No sales found."
    />
  );
}