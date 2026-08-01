'use client';

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarIcon, RefreshCw, Users, ArrowLeftRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import type { Connection, Area, Splitter } from '@/lib/types';

interface UpdateConnectionTableProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
}

const PAGE_SIZES = [10, 20, 50];

const TYPE_LABELS: Record<string, string> = {
  both: 'Both',
  internet: 'Internet',
  tv_cable: 'TV Cable',
};

const DISCOUNT_LABELS: Record<string, string> = {
  no_discount: 'No Discount',
  quarter: 'Quarter',
  half: 'Half',
  full_free: 'Full Free',
  custom: 'Custom',
};

function formatStoredDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return format(date, 'dd MMM yyyy');
}

function formatMoney(value: number): string {
  return (value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function UpdateConnectionTable({ title, subtitle, icon: Icon, gradient }: UpdateConnectionTableProps) {
  const { companyId } = useCompany();

  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: connectionsData, isLoading } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: splittersData } = useGenericQuery<Splitter>('network/splitters', companyId ?? undefined);

  const connections = connectionsData || [];
  const areas = areasData || [];
  const splitters = splittersData || [];

  const areaById = useMemo(() => {
    const map = new Map<string, Area>();
    areas.forEach((a) => map.set(a.id, a));
    return map;
  }, [areas]);

  const splitterById = useMemo(() => {
    const map = new Map<string, Splitter>();
    splitters.forEach((s) => map.set(s.id, s));
    return map;
  }, [splitters]);

  const filteredConnections = useMemo(() => {
    let result = connections;
    if (fromDate) {
      const from = format(fromDate, 'yyyy-MM-dd');
      result = result.filter((c) => (c.installationDate || '').slice(0, 10) >= from);
    }
    if (toDate) {
      const to = format(toDate, 'yyyy-MM-dd');
      result = result.filter((c) => (c.installationDate || '').slice(0, 10) <= to);
    }
    return result;
  }, [connections, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredConnections.length / pageSize));
  const paginatedConnections = filteredConnections.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    deactivated: 'bg-red-100 text-red-700 border-red-200',
    suspended: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const resetFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="h-0.5 mt-4 bg-gradient-to-r from-amber-500 via-orange-500 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
            <div className="rounded-lg bg-blue-100 p-2.5 transition-all duration-300 group-hover:scale-110">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold">{filteredConnections.length}</p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Active</p>
            <div className="rounded-lg bg-emerald-100 p-2.5 transition-all duration-300 group-hover:scale-110">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {filteredConnections.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Cable & Internet</p>
            <div className="rounded-lg bg-amber-100 p-2.5 transition-all duration-300 group-hover:scale-110">
              <ArrowLeftRight className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold">{filteredConnections.filter((c) => c.connectionType === 'both').length}</p>
        </div>
      </div>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Filter subscribers by installation date.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => setCurrentPage(1)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Apply
              </Button>
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Showing {filteredConnections.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredConnections.length)} of {filteredConnections.length} subscribers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Internet ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Cell</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Sublocality</TableHead>
                  <TableHead>Install Date</TableHead>
                  <TableHead>Recharge Date</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Install Amount</TableHead>
                  <TableHead className="text-right">Other Amount</TableHead>
                  <TableHead className="text-right">Cable Amount</TableHead>
                  <TableHead className="text-right">Internet Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Internet Discount</TableHead>
                  <TableHead>Package Cable</TableHead>
                  <TableHead>Package Internet</TableHead>
                  <TableHead>Box Number</TableHead>
                  <TableHead>Splitter</TableHead>
                  <TableHead className="text-right">Splitter Port</TableHead>
                  <TableHead>Create Balance</TableHead>
                  <TableHead className="text-right">Balance Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={24} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading subscribers...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedConnections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={24} className="text-center py-8 text-muted-foreground">
                      No subscribers found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedConnections.map((connection) => {
                    const area = connection.sublocalityId ? areaById.get(connection.sublocalityId) : undefined;
                    const splitter = connection.splitterId ? splitterById.get(connection.splitterId) : undefined;
                    return (
                      <TableRow key={connection.id}>
                        <TableCell className="whitespace-nowrap text-sm font-medium">{connection.internetId}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.name}</TableCell>
                        <TableCell className="text-sm">
                          <div className="max-w-[180px] truncate" title={connection.address}>{connection.address || '—'}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.cell || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.mobile || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{area?.subLocality || area?.locality || connection.sublocalityId || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatStoredDate(connection.installationDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatStoredDate(connection.rechargeDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.connectionProvider || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{TYPE_LABELS[connection.connectionType || ''] || connection.connectionType || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={cn('border', statusStyles[connection.status] || 'bg-gray-100 text-gray-600 border-gray-200')}>
                            {connection.status ? connection.status.charAt(0).toUpperCase() + connection.status.slice(1) : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">{formatMoney(connection.installationAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">{formatMoney(connection.otherAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">{formatMoney(connection.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">{formatMoney(connection.sameAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{DISCOUNT_LABELS[connection.discount || ''] || connection.discount || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{DISCOUNT_LABELS[connection.sameDiscount || ''] || connection.sameDiscount || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.packageCable || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.packageInternet || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{connection.boxNumber || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{splitter?.name || connection.splitterId || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">{connection.splitterPort || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {connection.createBalance ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">{connection.balanceDays || '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(parseInt(value)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
