'use client'

import { DataTable } from './data-table';
import { columns } from './columns';
import type { DealerCollection } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface ClientPageProps {
    data: DealerCollection[];
}

export default function ClientPage({ data }: ClientPageProps) {
    const [filter, setFilter] = useState('');

    const filteredData = data
    .filter(item => 
        item?.dealerName?.toLowerCase().includes(filter.toLowerCase()) || 
        item?.subscriberName?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <Input 
                    placeholder="Filter by dealer or subscriber..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <DataTable columns={columns} data={filteredData} />
        </div>
    )
}
