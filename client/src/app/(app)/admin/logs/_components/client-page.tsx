'use client'

import { DataTable } from './data-table';
import { columns } from './columns';
import type { SystemLog } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface ClientPageProps {
    data: SystemLog[];
}

export function ClientPage({ data }: ClientPageProps) {
    const [filter, setFilter] = useState('');

    const filteredData = data.filter(log => 
        log.user.toLowerCase().includes(filter.toLowerCase()) || 
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        log.details.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <Input 
                    placeholder="Filter by user, action, or details..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <DataTable columns={columns} data={filteredData} />
        </div>
    )
}
