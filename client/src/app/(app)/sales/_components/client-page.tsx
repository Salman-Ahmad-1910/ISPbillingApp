'use client';

import { DataTable } from './data-table';
import { columns } from './columns';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';

interface Sale {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  companyId: string;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface ClientPageProps {
  data: Sale[];
}

export function ClientPage({ data }: ClientPageProps) {
  const [filter, setFilter] = useState('');

  const filteredData = useMemo(() => data.filter(sale =>
    sale?.subscriberName?.toLowerCase()?.includes(filter?.toLowerCase()) ||
    sale?.paymentMethod?.toLowerCase()?.includes(filter?.toLowerCase())
  ), [data, filter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Input 
          placeholder="Filter by subscriber name or payment method..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm flex-1"
        />
      </div>
      <DataTable columns={columns} data={filteredData} />
    </div>
  );
}
