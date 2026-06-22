'use client';

import { DataTable } from './data-table';
import { columns } from './columns';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface RecoveryTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  officerId: string;
  createdAt: string;
}

interface MyCollectionsClientPageProps {
  data: RecoveryTransaction[];
}

export function MyCollectionsClientPage({ data }: MyCollectionsClientPageProps) {
  const [filter, setFilter] = useState('');

  // Debug: Log received data
  console.log('MyCollectionsClientPage - Received data:', data);

  const filteredData = data
    .filter(item => 
      item?.description?.toLowerCase().includes(filter.toLowerCase()) || 
      item?.type?.toLowerCase().includes(filter.toLowerCase())
    );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Input 
          placeholder="Filter by description or type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm flex-1"
        />
      </div>
      <DataTable columns={columns} data={filteredData} />
    </div>
  );
}
