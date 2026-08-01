'use client';

import { SystemLogsTable } from '../_components/system-log-table';
import { UserX } from 'lucide-react';

export default function DeletedMembersLogsPage() {
  return (
    <SystemLogsTable
      title="Deleted Members"
      subtitle="View all deleted subscribers, staff, dealers and recovery officers."
      icon={UserX}
      gradient="from-blue-500 to-indigo-600"
      defaultAction="delete"
      includePages={['subscribers', 'connections', 'users', 'hr', 'staff', 'dealers', 'recovery-officers']}
      showRestore
    />
  );
}
