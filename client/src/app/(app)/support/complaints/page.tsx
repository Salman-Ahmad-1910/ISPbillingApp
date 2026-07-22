'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { MessageSquare, Users, CheckCircle2, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import { useMemo } from 'react';
import type { Staff, Complaint, Subscriber } from '@/lib/types';


export default function ComplaintsPage() {
  const { companyId } = useCompany();

  const { data: complaints = [], isLoading: isLoadingComplaints } = useGenericQuery<Complaint>('support/complaints', companyId ?? undefined);
  const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<Subscriber>('subscribers', companyId ?? undefined);
  const { data: staffData = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  const kpiData = useMemo(() => [
    { title: 'Total Complaints', value: complaints.length, icon: MessageSquare, gradient: 'from-blue-500 to-cyan-600' },
    { title: 'Open', value: complaints.filter(c => c.status === 'open').length, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
    { title: 'Resolved', value: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
    { title: 'Subscribers', value: subscribers.length, icon: Users, gradient: 'from-violet-500 to-purple-600' },
  ], [complaints, subscribers]);

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Complaint Management</h1>
            <p className="text-sm text-muted-foreground">Track and resolve subscriber issues.</p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Please select a company to manage complaints.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingComplaints || isLoadingSubscribers || isLoadingStaff) {
    return <LoadingSpinner text="Loading complaints..." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaint Management</h1>
          <p className="text-sm text-muted-foreground">Track and resolve subscriber issues.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </div>
              <div className={`rounded-lg bg-gradient-to-br ${kpi.gradient} p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-0">
          <ClientPage data={complaints} subscribers={subscribers} staff={staffData} />
        </CardContent>
      </Card>
    </div>
  );
}
