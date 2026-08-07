'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, UserPlus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';

interface NewSubscriberRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  status: string;
  createdDate: string;
  createdBy: string;
}

function resolveAreaName(areas: any[], sublocalityId?: string): string {
  if (!sublocalityId) return '';
  const area = areas.find((a: any) => a.id === sublocalityId);
  if (!area) return '';
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
}

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

export default function NewSubscribersListPage() {
  const { companyId } = useCompany();

  const { data: connections = [], isLoading: loading } = useGenericQuery<any>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<any>('network/areas', companyId ?? undefined);
  const { data: users = [] } = useGenericQuery<any>('admin/users', companyId ?? undefined, { includeAdmin: true });

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showReport, setShowReport] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showAll, setShowAll] = useState(false);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u: any) => { if (u.id) map[u.id] = u.name; });
    return map;
  }, [users]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c: any) => {
      const areaName = resolveAreaName(areas, c.sublocalityId);
      if (areaName) set.add(areaName);
    });
    return Array.from(set).sort();
  }, [connections, areas]);

  const allRecords: NewSubscriberRecord[] = useMemo(() => {
    return connections.map((c: any) => ({
      id: c.id,
      subscriberName: c.name || '',
      subscriberId: c.internetId || '',
      phone: c.cell || c.mobile || '',
      address: c.address || '',
      sublocality: resolveAreaName(areas, c.sublocalityId),
      connectionType: c.connectionType || 'both',
      status: c.status || 'active',
      createdDate: c.createdAt || c.installationDate || '',
      createdBy: userMap[c.createdBy] || '',
    }));
  }, [connections, areas, userMap]);

  const filteredData = useMemo(() => {
    if (!showReport) return [];
    return allRecords.filter((item) => {
      const itemDate = new Date(item.createdDate);
      if (isNaN(itemDate.getTime())) return false;
      const from = new Date(filterFromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(filterToDate);
      to.setHours(23, 59, 59, 999);

      const dateMatch = itemDate >= from && itemDate <= to;
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
      const statusMatch = statusFilter === 'all' || item.status === statusFilter;

      return dateMatch && sublocalityMatch && connectionMatch && statusMatch;
    });
  }, [allRecords, filterFromDate, filterToDate, sublocality, connectionType, statusFilter, showReport]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterFromDate, filterToDate, sublocality, connectionType, statusFilter, pageSize, showAll]);

  const totalRecords = showReport ? filteredData.length : allRecords.length;
  const activeRecords = (showReport ? filteredData : allRecords).filter((r) => r.status === 'active').length;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize, showAll]);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Status', 'Created Date', 'Created By'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.phone,
      item.address,
      item.sublocality,
      item.connectionType,
      item.status,
      item.createdDate,
      item.createdBy,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `new-subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-emerald-600', border: 'border-emerald-600', headerBg: 'bg-emerald-600', rowHover: 'hover:bg-emerald-50/50' };
    const columns: InvoiceColumn<NewSubscriberRecord>[] = [
      { header: '#', render: (_: NewSubscriberRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
      { header: 'Subscriber ID', render: (r) => r.subscriberId || '-' },
      { header: 'Phone', render: (r) => r.phone || '-' },
      { header: 'Address', render: (r) => r.address || '-' },
      { header: 'Sublocality', render: (r) => r.sublocality || '-' },
      { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType || '-'}</span> },
      { header: 'Status', render: (r) => <span className="capitalize">{r.status || '-'}</span> },
      { header: 'Created Date', render: (r) => (r.createdDate ? format(new Date(r.createdDate), 'dd MMM yyyy') : '-') },
      { header: 'Created By', render: (r) => r.createdBy || '-' },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<NewSubscriberRecord>
          title="NEW SUBSCRIBERS LIST"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No new subscribers found for the selected criteria."
          onBack={() => setShowInvoice(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 shadow-sm">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Subscribers List</h1>
          <p className="text-sm text-muted-foreground">Subscribers added during the selected period</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-teal-500/30 to-transparent no-print" />

      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Subscribers</p>
              <p className="text-2xl font-bold mt-1">{activeRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Badge variant="outline" className="border-white/40 bg-transparent text-white">Active</Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={filterFromDateOpen} onOpenChange={setFilterFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !filterFromDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterFromDate ? format(filterFromDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filterFromDate} onSelect={(date) => { if (date) { setFilterFromDate(date); setFilterFromDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={filterToDateOpen} onOpenChange={setFilterToDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !filterToDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterToDate ? format(filterToDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filterToDate} onSelect={(date) => { if (date) { setFilterToDate(date); setFilterToDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Sublocality</Label>
              <Select value={sublocality} onValueChange={setSublocality}>
                <SelectTrigger><SelectValue placeholder="Select sublocality" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {allSublocalities.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="tv_cable">TV Cable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button
              onClick={() => {
                setShowReport(true);
                setCurrentPage(1);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Show Report
            </Button>
            {showReport && (
              <Button variant="outline" onClick={() => setShowReport(false)}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">New Subscribers List</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {format(filterFromDate, 'dd MMM yyyy')} — To: {format(filterToDate, 'dd MMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handlePrint} disabled={!showReport}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel} disabled={!showReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {!showReport ? (
              <div className="text-center py-8 text-muted-foreground">
                Select the filters above and press the Show Report button to generate the report.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No new subscribers found for the selected criteria.
              </div>
            ) : (
              <>
                <div className="min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Subscriber Name</TableHead>
                        <TableHead>Subscriber ID</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Sublocality</TableHead>
                        <TableHead>Connection Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item, i) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{showAll ? i + 1 : (safePage - 1) * pageSize + i + 1}</TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/crm/subscriber-detail?connectionId=${item.id}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {item.subscriberName}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.subscriberId || '---'}</TableCell>
                          <TableCell>{item.phone || '---'}</TableCell>
                          <TableCell>{item.address || '---'}</TableCell>
                          <TableCell>{item.sublocality || '---'}</TableCell>
                          <TableCell className="capitalize">{item.connectionType || '---'}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className={item.status === 'active' ? 'bg-green-600' : ''}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.createdDate ? format(new Date(item.createdDate), 'dd MMM yyyy') : '---'}</TableCell>
                          <TableCell>{item.createdBy || '---'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 no-print">
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedData.length === 0 ? 0 : (showAll ? 1 : (safePage - 1) * pageSize + 1)} to {Math.min(safePage * pageSize, filteredData.length)} of {filteredData.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Show</Label>
                      <Select
                        value={showAll ? 'all' : String(pageSize)}
                        onValueChange={(value) => {
                          if (value === 'all') {
                            setShowAll(true);
                          } else {
                            setShowAll(false);
                            setPageSize(parseInt(value));
                          }
                        }}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent portal={false}>
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                          ))}
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label className="text-sm text-muted-foreground">entries</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={safePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-2 text-sm text-muted-foreground">
                        Page {safePage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={safePage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
