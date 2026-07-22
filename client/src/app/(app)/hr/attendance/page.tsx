'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Fingerprint, ClipboardList, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import { ClientPage } from './_components/client-page';
import { useCompany } from '@/context/company-context';
import type { Staff, Attendance } from '@/lib/types';

export default function AttendancePage() {
  const { companyId } = useCompany();

  const { data: attendance = [], isLoading: isLoadingAttendance } = useGenericQuery<Attendance>('hr/attendance', companyId ?? undefined);
  const { data: staff = [], isLoading: isLoadingStaff } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  const kpiData = useMemo(() => [
    { label: 'Total Records', value: attendance.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Present', value: attendance.filter(a => a.status === 'present').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Absent', value: attendance.filter(a => a.status === 'absent').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Late', value: attendance.filter(a => a.status === 'late').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  ], [attendance]);

  const isLoading = isLoadingAttendance || isLoadingStaff;

  if (companyId && isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><LoadingSpinner text="Loading attendance..." /></div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Staff Attendance</h1>
            <p className="text-sm text-muted-foreground">Track employee check-ins, check-outs, and shifts.</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((metric) => (
          <div key={metric.label} className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <div className={`rounded-lg ${metric.bg} p-2.5 transition-all duration-300 group-hover:scale-110`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold">{metric.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardContent className="p-0">
          <ClientPage data={attendance} staff={staff} />
        </CardContent>
      </Card>
    </>
  );
}
