'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Wallet, Percent, Clock, XCircle, CheckCircle2, MapPin, Phone, CalendarDays, Handshake, ArrowRightLeft } from 'lucide-react';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useUser } from '@/hooks/use-user';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useCompany } from '@/context/company-context';
import type { Dealer, Subscriber } from '@/lib/types';

const ADMIN_ROLES = ['admin', 'owner', 'manager'];

export default function DealerDashboardPage() {
  const { companyId } = useCompany();
  const { user } = useUser();
  const isAdminUser = ADMIN_ROLES.includes(user?.role || '');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');

  const { data: dealers = [], isLoading } = useGenericQuery<Dealer>(
    'dealers',
    companyId ?? undefined
  );
  const { data: subscribers = [] } = useGenericQuery<Subscriber>(
    companyId ? 'billing/subscribers' : null,
    companyId ?? undefined
  );

  const dealer = useMemo(() => {
    if (isAdminUser) {
      if (selectedDealerId) {
        return dealers.find(d => d.id === selectedDealerId) || null;
      }
      const own = dealers.find(d => d.email === user?.email);
      return own || dealers[0] || null;
    }
    return dealers.find(d => d.email === user?.email) || null;
  }, [dealers, isAdminUser, selectedDealerId, user?.email]);

  const mySubscribers = useMemo(
    () => subscribers.filter(s => s.dealerId === dealer?.id),
    [subscribers, dealer?.id]
  );

  const subscriberStats = useMemo(() => {
    const stats = { total: 0, active: 0, inactive: 0, pending: 0 };
    mySubscribers.forEach(s => {
      stats.total += 1;
      if (s.status === 'active') stats.active += 1;
      if (s.status === 'suspended' || s.status === 'inactive' || s.status === 'deactivated') stats.inactive += 1;
      if ((s.balance || 0) > 0) stats.pending += 1;
    });
    return stats;
  }, [mySubscribers]);

  if (companyId && isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner text="Loading your dashboard..." />
      </div>
    );
  }

  if (!dealer) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Handshake className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No dealer account linked</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdminUser
              ? 'No dealers found for this company.'
              : 'No dealer record matches the account you are logged in with. This dashboard shows each dealer their own summary.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const summaryCards = [
    { title: 'Total Subscribers', value: subscriberStats.total, caption: isAdminUser ? 'assigned to dealer' : 'assigned to you', icon: Users, gradient: 'from-sky-500 to-blue-500' },
    { title: 'Active Subscribers', value: subscriberStats.active, caption: 'currently active', icon: CheckCircle2, gradient: 'from-blue-500 to-cyan-500' },
    { title: 'Inactive Subscribers', value: subscriberStats.inactive, caption: 'suspended / inactive', icon: XCircle, gradient: 'from-orange-500 to-amber-500' },
    { title: 'Pending Subscribers', value: subscriberStats.pending, caption: 'still owe amount', icon: Clock, gradient: 'from-amber-500 to-orange-500' },
  ];

  const financialCards = [
    { title: 'Wallet Balance', value: `PKR ${(dealer.walletBalance || 0).toLocaleString()}`, caption: 'available commission', icon: Wallet, gradient: 'from-emerald-500 to-green-500' },
    { title: 'Remaining Amount', value: `PKR ${(dealer.remainingAmount || 0).toLocaleString()}`, caption: 'outstanding dues', icon: ArrowRightLeft, gradient: 'from-amber-500 to-orange-500' },
    { title: 'Commission Rate', value: `${dealer.commissionRate || 0}%`, caption: 'earned per sale', icon: Percent, gradient: 'from-purple-500 to-indigo-500' },
    { title: 'Last Payment', value: dealer.lastPaymentDate || '—', caption: 'most recent payment date', icon: CalendarDays, gradient: 'from-teal-500 to-emerald-500' },
  ];

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dealer Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {isAdminUser ? 'View the summary of any dealer.' : 'Your own summary overview.'}
            </p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-emerald-500 via-green-500 to-transparent" />
      </div>

      {isAdminUser && (
        <div className="mb-6 max-w-sm">
          <Select value={dealer.id} onValueChange={(v) => setSelectedDealerId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a dealer" />
            </SelectTrigger>
            <SelectContent portal={false}>
              {dealers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="mb-6 overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 to-transparent p-4 dark:from-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 font-bold text-white shadow-sm">
                {dealer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold leading-tight">{dealer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {dealer.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {dealer.commissionRate}% Commission
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {dealer.phone || '—'}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {dealer.areaName || '—'}
            </span>
            <span className="text-muted-foreground">{dealer.address || ''}</span>
          </div>
        </CardContent>
      </Card>

      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-base font-semibold">Subscriber Overview</h2>
        <span className="text-xs text-muted-foreground">summary of {mySubscribers.length} subscribers</span>
      </div>

      <div className="flex flex-wrap items-stretch gap-3 mb-6">
        {summaryCards.map((card) => (
          <Card key={card.title} className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 min-h-[140px] flex-1 min-w-[180px] max-w-[280px] cursor-pointer">
            <div className={`absolute inset-0 opacity-[0.03] dark:opacity-[0.06] bg-gradient-to-br ${card.gradient}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 relative">
              <CardTitle className="text-[11px] font-medium leading-tight">{card.title}</CardTitle>
              <div className={`rounded-lg p-1.5 bg-gradient-to-br ${card.gradient} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <card.icon className="h-3 w-3" />
              </div>
            </CardHeader>
            <CardContent className="relative pt-0 flex-1 flex flex-col justify-end pb-6">
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-base font-semibold">Financial Overview</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {financialCards.map((card) => (
          <Card key={card.title} className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 min-h-[140px] cursor-pointer">
            <div className={`absolute inset-0 opacity-[0.03] dark:opacity-[0.06] bg-gradient-to-br ${card.gradient}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 relative">
              <CardTitle className="text-[11px] font-medium leading-tight">{card.title}</CardTitle>
              <div className={`rounded-lg p-1.5 bg-gradient-to-br ${card.gradient} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <card.icon className="h-3 w-3" />
              </div>
            </CardHeader>
            <CardContent className="relative pt-0 flex-1 flex flex-col justify-end pb-6">
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}