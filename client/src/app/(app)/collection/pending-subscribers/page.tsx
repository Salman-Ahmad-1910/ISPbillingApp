'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, ArrowLeft, Users, Wallet, Loader2, Search, Tv, Wifi, Layers } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { Connection, Area, DistributionBox, Package, Company } from '@/lib/types';
import { ConnectionFilterBar } from '@/components/shared/connection-filter-bar';
import { defaultConnectionFilters, type ConnectionFilterState } from '@/lib/connection-filters';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { CollectionPagination } from '@/components/shared/collection-pagination';

function getPackagePrice(c: Connection): number {
  const cable = Number(c.amount) || 0;
  const internet = Number(c.sameAmount) || 0;
  if (c.connectionType === 'tv_cable') return cable;
  if (c.connectionType === 'internet') return internet;
  return cable + internet;
}

export default function PendingSubscribersPage() {
  const { companyId } = useCompany();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<ConnectionFilterState>(defaultConnectionFilters());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);

  const [subscribers, setSubscribers] = useState<Connection[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);
  const [tvCableCount, setTvCableCount] = useState(0);
  const [internetCount, setInternetCount] = useState(0);
  const [bothCount, setBothCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const { data: areasData } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: boxesData } = useGenericQuery<DistributionBox>('network/boxes', companyId ?? undefined);
  const { data: packagesData } = useGenericQuery<Package>('billing/packages', companyId ?? undefined);
  const { data: companiesData } = useGenericQuery<Company>('companies', companyId ?? undefined);

  // Debounce the free-text search so we're not hitting the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filters, dateFrom, dateTo, pageSize]);

  const fetchPending = useCallback(() => {
    if (!companyId) return;
    const myRequestId = ++requestId.current;
    setLoading(true);
    api.get('/collection/pending-subscribers', {
      params: {
        companyId,
        search: debouncedSearch || undefined,
        sublocality: filters.sublocality,
        status: filters.status,
        type: filters.type,
        box: filters.box,
        package: filters.package,
        discount: filters.discount,
        provider: filters.provider,
        sortBy: filters.sortBy,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: currentPage,
        pageSize,
      },
    })
      .then(res => {
        if (myRequestId !== requestId.current) return; // stale response, ignore
        const d = res.data.data;
        setSubscribers(d.subscribers || []);
        setTotalCount(d.totalCount || 0);
        setTotalPendingAmount(d.totalPendingAmount || 0);
        setTvCableCount(d.tvCableCount || 0);
        setInternetCount(d.internetCount || 0);
        setBothCount(d.bothCount || 0);
      })
      .catch(() => {
        if (myRequestId !== requestId.current) return;
        setSubscribers([]);
        setTotalCount(0);
        setTotalPendingAmount(0);
        setTvCableCount(0);
        setInternetCount(0);
        setBothCount(0);
      })
      .finally(() => {
        if (myRequestId === requestId.current) setLoading(false);
      });
  }, [companyId, debouncedSearch, filters, dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const setFilter = (key: keyof ConnectionFilterState, value: string) =>
    setFilters(f => ({ ...f, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Subscribers</h1>
          <p className="text-sm text-muted-foreground">Subscribers who still have a remaining amount</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="text-3xl font-bold mt-1">{totalCount}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending Amount</p>
                <p className="text-3xl font-bold mt-1">PKR {totalPendingAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Pending Amount</p>
                <p className="text-3xl font-bold mt-1">
                  PKR {totalCount > 0 ? Math.round(totalPendingAmount / totalCount).toLocaleString() : 0}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">TV Cable Pending</p>
                <p className="text-3xl font-bold mt-1">{tvCableCount}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 p-2.5 text-white shadow-sm">
                <Tv className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Internet Pending</p>
                <p className="text-3xl font-bold mt-1">{internetCount}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 p-2.5 text-white shadow-sm">
                <Wifi className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Both Pending</p>
                <p className="text-3xl font-bold mt-1">{bothCount}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm">
                <Layers className="h-5 w-5" />
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
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 opacity-30 mx-auto mb-3" />
              <p className="text-sm font-medium">No pending subscribers</p>
              <p className="text-xs mt-1">All subscribers have received full package fee payments.</p>
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
                    <TableHead>Package Fee</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((c, i) => {
                    const startIdx = pageSize === 'all' ? 0 : (currentPage - 1) * parseInt(pageSize, 10);
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
                        <TableCell className="font-semibold">
                          PKR {getPackagePrice(c).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-amber-600">
                          PKR {(Number(c.remainingAmount) || getPackagePrice(c)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Pending</Badge>
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

      {!loading && totalCount > 0 && (
        <CollectionPagination
          total={totalCount}
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
}
