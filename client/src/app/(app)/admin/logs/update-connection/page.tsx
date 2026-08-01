'use client';

import { UpdateConnectionTable } from '../_components/update-connection-table';
import { ArrowLeftRight } from 'lucide-react';

export default function UpdateConnectionLogsPage() {
  return (
    <UpdateConnectionTable
      title="Update Connection Log"
      subtitle="View all subscriber information and details."
      icon={ArrowLeftRight}
      gradient="from-amber-500 to-orange-600"
    />
  );
}
