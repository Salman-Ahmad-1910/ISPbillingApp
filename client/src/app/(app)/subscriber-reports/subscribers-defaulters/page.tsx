'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, TriangleAlert, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import type { Invoice, Connection, Area } from '@/lib/types';

interface DefaulterRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  remainingAmount: number;
  billingPeriods: string;
  dueDate: string;
  lastPaymentDate: string;
  status: string;
}

function resolveAreaName(areas: Area[], sublocalityId?: string): string {
  if (!sublocalityId) return '';
  const area = areas.find((a: Area) => a.id === sublocalityId);
  if (!area) return '';
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
}

function billingPeriodDueDate(period: string): Date | null {
  if (!period) return null;
  const d = parse(period, 'MMMM yyyy', new Date());
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), 30);
}

export default function SubscribersDefaultersPage() {
  const { companyId } = useCompany();

  const { data: invoices = [], isLoading: loading } = useGenericQuery<Invoice>('billing/invoices', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);

  const areas = areasData as Area[];

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => new Date(new Date().getFullYear() - 1, 0, 1));
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(() => new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [showInvoice, setShowInvoice] = useState(false);

  const connMap = useMemo(() => {
    const map: Record<string, { name: string; internetId: string; phone: string; address: string; sublocality: string; connectionType: string; lastPaymentDate: string; status: string }> = {};
    connections.forEach((c: Connection) => {
      map[c.id] = {
        name: c.name || '',
        internetId: c.internetId || '',
        phone: c.cell || c.mobile || '',
        address: c.address || '',
        sublocality: resolveAreaName(areas, c.sublocalityId),
        connectionType: c.connectionType || '',
        lastPaymentDate: c.lastPaymentDate || '',
        status: c.status || 'active',
      };
    });
    return map;
  }, [connections, areas]);

  const allRecords: DefaulterRecord[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map<string, DefaulterRecord>();

    invoices.forEach((inv: Invoice) => {
      if (inv.status === 'paid' || Number(inv.remainingAmount) <= 0) return;

      const due = billingPeriodDueDate(inv.billingPeriod || '');
      if (!due || today <= due) return;

      const conn = connMap[inv.subscriberId] || {};
      const remaining = Number(inv.remainingAmount) || 0;
      const period = inv.billingPeriod || '';
      const dueStr = format(due, 'yyyy-MM-dd');

      const existing = map.get(inv.subscriberId);
      if (existing) {
        existing.remainingAmount += remaining;
        if (period && !existing.billingPeriods.includes(period)) {
          existing.billingPeriods = existing.billingPeriods ? `${existing.billingPeriods}, ${period}` : period;
        }
        if (dueStr < existing.dueDate) existing.dueDate = dueStr;
      } else {
        map.set(inv.subscriberId, {
          id: inv.subscriberId,
          subscriberName: inv.subscriberName || conn.name || '',
          subscriberId: conn.internetId || inv.subscriberId,
          phone: conn.phone || '',
          address: conn.address || '',
          sublocality: conn.sublocality || '',
          connectionType: conn.connectionType || '',
          remainingAmount: remaining,
          billingPeriods: period,
          dueDate: dueStr,
          lastPaymentDate: conn.lastPaymentDate || '',
          status: conn.status || 'active',
        });
      }
    });
    return Array.from(map.values());
  }, [invoices, connMap]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => { if (r.sublocality) set.add(r.sublocality); });
    return Array.from(set);
  }, [allRecords]);

  const filteredData = useMemo(() => allRecords.filter((item) => {
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);

    const itemDate = new Date(item.dueDate);
    if (isNaN(itemDate.getTime())) return false;
    const dateMatch = itemDate >= from && itemDate <= to;

    return sublocalityMatch && connectionMatch && dateMatch;
  }), [allRecords, sublocality, connectionType, filterFromDate, filterToDate]);

  const totalRecords = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.remainingAmount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Remaining Amount', 'Billing Period', 'Due Date', 'Last Payment Date', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName, item.subscriberId, item.phone, item.address, item.sublocality,
      item.connectionType, item.remainingAmount.toFixed(2), item.billingPeriods, item.dueDate, item.lastPaymentDate, item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `subscribers-defaulters-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-rose-600', border: 'border-rose-600', headerBg: 'bg-rose-600', rowHover: 'hover:bg-rose-50/50' };
    const columns: InvoiceColumn<DefaulterRecord>[] = [
      { header: '#', render: (_: DefaulterRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
      { header: 'Subscriber ID', render: (r) => r.subscriberId.slice(0, 8) },
      { header: 'Phone', render: (r) => r.phone },
      { header: 'Address', render: (r) => r.address || '-' },
      { header: 'Sublocality', render: (r) => r.sublocality || '-' },
      { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType || '-'}</span> },
      { header: 'Remaining (PKR)', align: 'right', render: (r) => <span className="font-semibold">{r.remainingAmount.toLocaleString()}</span> },
      { header: 'Due Date', render: (r) => (r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : '-') },
      { header: 'Last Payment', render: (r) => (r.lastPaymentDate ? format(new Date(r.lastPaymentDate), 'dd MMM yyyy') : 'Never Paid') },
      { header: 'Status', render: (r) => <span className="capitalize">{r.status}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<DefaulterRecord>
          title="SUBSCRIBERS DEFAULTERS"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No defaulter subscribers found for the selected criteria."
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
        <div className="rounded-xl bg-gradient-to-br from-rose-500 to-red-600 p-2.5 shadow-sm">
          <TriangleAlert className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscribers Defaulters</h1>
          <p className="text-sm text-muted-foreground">Subscribers who have not paid by the 30th of their billing month</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-red-500/30 to-transparent no-print" />

      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Defaulters</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <TriangleAlert className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <TriangleAlert className="h-5 w-5" />
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
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button onClick={handlePrint} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Subscribers Defaulters List</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {format(filterFromDate, 'dd MMM yyyy')} — To: {format(filterToDate, 'dd MMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No defaulter subscribers found for the selected criteria.
              </div>
            ) : (
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
                      <TableHead>Remaining Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/subscriber-detail?connectionId=${item.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.subscriberName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.subscriberId.slice(0, 8)}</TableCell>
                        <TableCell>{item.phone || '---'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.address || '---'}</TableCell>
                        <TableCell>{item.sublocality || '---'}</TableCell>
                        <TableCell className="capitalize">{item.connectionType || '---'}</TableCell>
                        <TableCell className="font-semibold text-destructive">PKR {item.remainingAmount.toLocaleString()}</TableCell>
                        <TableCell>{item.dueDate ? format(new Date(item.dueDate), 'dd MMM yyyy') : '---'}</TableCell>
                        <TableCell>
                          {item.lastPaymentDate
                            ? format(new Date(item.lastPaymentDate), 'dd MMM yyyy')
                            : <Badge variant="destructive">Never Paid</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'deactivated' ? 'destructive' : 'default'} className={item.status === 'active' ? 'bg-green-600' : ''}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
