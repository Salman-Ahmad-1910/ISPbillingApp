'use client';

import { SystemLogsTable } from '../_components/system-log-table';
import { Trash2 } from 'lucide-react';

export default function DeletedCollectionsLogsPage() {
  return (
    <SystemLogsTable
      title="Deleted Collection"
      subtitle="View all deleted collection and payment records."
      icon={Trash2}
      gradient="from-rose-500 to-red-600"
      defaultAction="delete"
      includePages={['billing', 'dealers', 'financial']}
      showRestore
    />
  );
}
