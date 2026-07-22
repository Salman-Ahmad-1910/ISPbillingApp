'use client';

import { useEffect, useState, useCallback } from 'react';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, Users, Wallet, Clock, CheckCircle2, XCircle, ArrowUpRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Ticket } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/page-header';
import { GaugeMeter } from './_components/gauge-meter';

const DailyCollectionChart = dynamic(
  () => import('@/app/(app)/dashboard/_components/daily-collection-chart').then(mod => mod.DailyCollectionChart),
  {
    loading: () => <Skeleton className="lg:col-span-4 h-80" />,
    ssr: false
  }
);
const SubscriberGrowthChart = dynamic(
  () => import('@/app/(app)/dashboard/_components/subscriber-growth-chart').then(mod => mod.SubscriberGrowthChart),
  {
    loading: () => <Skeleton className="lg:col-span-3 h-80" />,
    ssr: false
  }
);

export default function DashboardPage() {
  const { companyId, companyName, companies } = useCompany();
  const currentCompany = companies.find(c => c.id === companyId);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetAmount, setTargetAmount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collection_target_${companyId}`);
      return stored ? parseFloat(stored) : 0;
    }
    return 0;
  });

  const logoUrl = currentCompany?.logo
    ? `${api?.defaults?.baseURL}/uploads/company_images/${currentCompany.id}`
    : null;

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      api.get(`/dashboard?companyId=${companyId}`)
        .then(response => {
          setData(response.data.data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch dashboard data", error);
          setLoading(false);
        });
    }
  }, [companyId]);

  const handleTargetSave = useCallback((target: number) => {
    setTargetAmount(target);
    localStorage.setItem(`collection_target_${companyId}`, target.toString());
  }, [companyId]);

  const totalCollection = data?.totalCollectionToday || 0;

  const kpiConfig = [
    { title: 'Active Subscribers', value: data?.subscribersStats?.active || 0, icon: Users, change: `in ${companyName}`, gradient: 'from-blue-500 to-cyan-500', bgLight: 'bg-blue-50 dark:bg-blue-950/30' },
    { title: 'Total Collection (Today)', value: `PKR ${(data?.totalCollectionToday || 0).toLocaleString()}`, icon: Wallet, change: 'real-time total', gradient: 'from-emerald-500 to-green-500', bgLight: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  const kpiConfigRight = [
    { title: 'Overdue Subscribers', value: data?.overdueCount || 0, icon: AlertCircle, change: 'unpaid accounts', gradient: 'from-rose-500 to-pink-500', bgLight: 'bg-rose-50 dark:bg-rose-950/30' },
    { title: 'Total Overdue', value: `PKR ${(data?.overdueAmount || 0).toLocaleString()}`, icon: AlertCircle, change: 'past due amount', gradient: 'from-red-600 to-rose-500', bgLight: 'bg-red-50 dark:bg-red-950/30' },
  ];

  if (loading) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Loading real-time overview..."
        />
        <div className="grid gap-4 lg:grid-cols-5 items-center">
          {[...Array(2)].map((_, i) => <Skeleton key={`l${i}`} className="h-28" />)}
          <Skeleton className="h-36 rounded-xl" />
          {[...Array(2)].map((_, i) => <Skeleton key={`r${i}`} className="h-28" />)}
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="lg:col-span-4 h-80" />
          <Skeleton className="lg:col-span-3 h-80" />
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader
          title="Error"
          description="Could not load dashboard data. Please try again later."
        />
      </>
    )
  }

  const payMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return <CircleDollarSign className="h-3.5 w-3.5 text-emerald-500" />;
      case 'card': return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
      case 'bank': return <Landmark className="h-3.5 w-3.5 text-purple-500" />;
      default: return <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-stretch gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-[60px] w-[60px] rounded-lg object-contain shadow-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 p-2.5 text-white shadow-sm flex-shrink-0">
                <LayoutDashboard className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">{`${companyName || ''} Dashboard`}</h1>
              <p className="mt-1 text-muted-foreground text-sm md:text-base">Here&apos;s a real-time overview of your network and business operations.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-3">
            {[...kpiConfig, ...kpiConfigRight].map((kpi) => (
              <Card
                key={kpi.title}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex-1 min-w-[180px] max-w-[280px] min-h-[160px]"
              >
                <div className={`absolute inset-0 opacity-[0.03] dark:opacity-[0.06] bg-gradient-to-br ${kpi.gradient}`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 relative">
                  <CardTitle className="text-[11px] font-medium leading-tight">{kpi.title}</CardTitle>
                  <div className={`rounded-lg p-1.5 bg-gradient-to-br ${kpi.gradient} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                    <kpi.icon className="h-3 w-3" />
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0 flex-1 flex flex-col justify-end pb-6">
                  <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <GaugeMeter
            currentAmount={totalCollection}
            targetAmount={targetAmount}
            onTargetSave={handleTargetSave}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 transition-all duration-300 rounded-xl">
          <DailyCollectionChart />
        </div>
        <div className="lg:col-span-3 transition-all duration-300 rounded-xl">
          <SubscriberGrowthChart />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="group transition-all duration-300 hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <CardTitle>Recent Payments</CardTitle>
              </div>
              <Link href="/billing/payments" className="text-sm text-primary hover:underline inline-flex items-center gap-1 transition-all hover:gap-1.5">
                View All <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <CardDescription>Latest payments received from subscribers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscriber</TableHead>
                  <TableHead className="text-right">Amount (PKR)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.slice(0, 5).map((payment: any, idx: number) => (
                  <TableRow
                    key={payment.id}
                    className="transition-colors duration-150 hover:bg-muted/50"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <TableCell className="font-medium">{payment.subscriberName}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{payment.paymentDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize gap-1.5 font-normal">
                        {payMethodIcon(payment.method)}
                        {payment.method}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.payments?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="h-8 w-8 text-muted-foreground/40" />
                        <span className="text-sm">No payments yet</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-2 text-orange-600 dark:text-orange-400">
                  <Ticket className="h-4 w-4" />
                </div>
                <CardTitle>Open Complaints</CardTitle>
              </div>
              <Link href="/support/complaints" className="text-sm text-primary hover:underline inline-flex items-center gap-1 transition-all hover:gap-1.5">
                View All <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <CardDescription>Tickets that need attention from the support team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Opened On</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.complaints.filter((c: any) => c.status !== 'resolved' && c.status !== 'closed').slice(0, 5).map((complaint: any, idx: number) => (
                  <TableRow
                    key={complaint.id}
                    className="transition-colors duration-150 hover:bg-muted/50"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <TableCell className="font-medium">{complaint.subscriberName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize font-normal">
                        {complaint.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={complaint.status === 'open' ? 'destructive' : 'secondary'}
                        className="gap-1 capitalize font-normal"
                      >
                        {complaint.status === 'open' ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {complaint.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.complaints?.filter((c: any) => c.status !== 'resolved' && c.status !== 'closed').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
                        <span className="text-sm">No open complaints</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
