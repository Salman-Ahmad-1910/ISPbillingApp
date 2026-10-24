'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, Users, Wallet, Loader2, Search } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Button } from '@/components/ui/button';
import type { Connection, Area, DistributionBox, Package, Company } from '@/lib/types';
import { ConnectionFilterBar } from '@/components/shared/connection-filter-bar';
import { applyConnectionFilters, applyConnectionDateRange, defaultConnectionFilters, type ConnectionFilterState } from '@/lib/connection-filters';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { CollectionPagination } from '@/components/shared/collection-pagination';

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getLastActiveDate(c: Connection): string {
  return c.lastPaymentDate || c.rechargeDate || c.createdAt;
}

function getMonthsSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function getTotalOwed(c: Connection): number {
  const remaining = Number(c.remainingAmount) || 0;
  const activeDate = getLastActiveDate(c);
  const months = getMonthsSince(activeDate);
  const cable = Number(c.amount) || 0;
  const internet = Number(c.sameAmount) || 0;
  const packagePrice = c.connectionType === 'tv_cable' ? cable : c.connectionType === 'internet' ? internet : cable + internet;
  return remaining + packagePrice * Math.max(0, months);
}

// Billing cycle is monthly (30 days) with a 3-day grace period (33 days total).
const GRACE_DAYS = 33;

export default function InactiveSubscribersPage() {
  const { companyId } = useCompany();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ConnectionFilterState>(defaultConnectionFilters());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: connections = [], isLoading: loading } = useGenericQuery<Connection>(
    'admin/connections',
    companyId ?? undefined,
  );
  const { data: areasData } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: boxesData } = useGenericQuery<DistributionBox>('network/boxes', companyId ?? undefined);
  const { data: packagesData } = useGenericQuery<Package>('billing/packages', companyId ?? undefined);
  const { data: companiesData } = useGenericQuery<Company>('companies', companyId ?? undefined);

  const inactiveSubscribers = useMemo(() => {
    return (connections as Connection[]).filter(c => {
      const activeDate = getLastActiveDate(c);
      if (!activeDate) return false;
      // Inactive = still owes money (remaining_amount > 0) AND past the grace
      // window (33 days). Membership matches the backend dashboard card.
      const owes = (Number(c.remainingAmount) || 0) > 0;
      return owes && getDaysSince(activeDate) > GRACE_DAYS;
    });
  }, [connections]);

  const filteredSubscribers = useMemo(
    () => applyConnectionFilters(inactiveSubscribers, filters, search),
    [inactiveSubscribers, filters, search],
  );

  const dateFilteredSubscribers = useMemo(
    () => applyConnectionDateRange(filteredSubscribers, dateFrom, dateTo),
    [filteredSubscribers, dateFrom, dateTo],
  );

  const pageSizeNum = pageSize === 'all' ? dateFilteredSubscribers.length : parseInt(pageSize, 10);
  const startIdx = pageSize === 'all' ? 0 : (currentPage - 1) * pageSizeNum;
  const pagedSubscribers = useMemo(
    () => (pageSize === 'all' ? dateFilteredSubscribers : dateFilteredSubscribers.slice(startIdx, startIdx + pageSizeNum)),
    [dateFilteredSubscribers, pageSize, currentPage, startIdx, pageSizeNum],
  );

  useEffect(() => { setCurrentPage(1); }, [search, filters, dateFrom, dateTo, pageSize]);

  const setFilter = (key: keyof ConnectionFilterState, value: string) =>
    setFilters(f => ({ ...f, [key]: value }));

  const totalPending = dateFilteredSubscribers.reduce((sum, c) => sum + getTotalOwed(c), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inactive Subscribers</h1>
          <p className="text-sm text-muted-foreground">Subscribers who failed to pay within 33 days (30-day cycle + 3-day grace)</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-pink-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inactive</p>
                <p className="text-3xl font-bold mt-1">{inactiveSubscribers.length}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inactive Amount</p>
                <p className="text-3xl font-bold mt-1">PKR {totalPending.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConnectionFilterBar
        filters={filters}
        onChange={setFilter}
        data={{
          areas: (areasData || []),
          boxes: (boxesData || []),
          packages: (packagesData || []),
          companies: (companiesData || []),
        }}
      />

      <DateRangeFilter
        from={dateFrom}
        to={dateTo}
        onFromChange={(v) => setDateFrom(v)}
        onToChange={(v) => setDateTo(v)}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, or internet ID..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dateFilteredSubscribers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 opacity-30 mx-auto mb-3" />
              <p className="text-sm font-medium">No inactive subscribers</p>
              <p className="text-xs mt-1">All subscribers are up to date with their payments.</p>
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Days Inactive</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {pagedSubscribers.map((c, i) => {
                     const activeDate = getLastActiveDate(c);
                    const monthsSince = getMonthsSince(activeDate);
                    const daysSince = getDaysSince(activeDate);
                    const isCurrentMonthOnly = monthsSince <= 0 && (Number(c.remainingAmount) || 0) > 0;
                    return (
                         <TableRow key={c.id}>
                         <TableCell className="text-muted-foreground">{startIdx + i + 1}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/subscriber-detail?connectionId=${c.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.id?.slice(0, 8) || '---'}</TableCell>
                        <TableCell>{c.cell || c.mobile || '---'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={c.address}>
                          {c.address || '---'}
                        </TableCell>
                        <TableCell>{c.packageInternet || c.packageCable || '---'}</TableCell>
                        <TableCell className="font-semibold text-destructive">
                          PKR {getTotalOwed(c).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">{activeDate ? new Date(activeDate).toLocaleDateString() : '---'}</TableCell>
                        <TableCell>
                          {isCurrentMonthOnly ? (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">{daysSince} days</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && dateFilteredSubscribers.length > 0 && (
        <CollectionPagination
          total={dateFilteredSubscribers.length}
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
}
