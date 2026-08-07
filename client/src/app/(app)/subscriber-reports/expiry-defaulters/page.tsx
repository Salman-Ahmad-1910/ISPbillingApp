'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, BarChartBig, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';

interface RechargeRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  rechargeDate: string;
  amount: number;
  status: string;
}

function resolveAreaName(areas: any[], sublocalityId?: string): string {
  if (!sublocalityId) return '';
  const area = areas.find((a: any) => a.id === sublocalityId);
  if (!area) return '';
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
}

export default function ExpiryDefaultersPage() {
  const { companyId } = useCompany();

  const { data: connections = [], isLoading: loading } = useGenericQuery<any>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<any>('network/areas', companyId ?? undefined);

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [sublocality, setSublocality] = useState('all');
  const [showInvoice, setShowInvoice] = useState(false);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c: any) => {
      const areaName = resolveAreaName(areas, c.sublocalityId);
      if (areaName) set.add(areaName);
    });
    return Array.from(set);
  }, [connections, areas]);

  const allRecords: RechargeRecord[] = useMemo(() => {
    return connections
      .filter((c: any) => Number(c.remainingAmount) > 0)
      .map((c: any) => ({
        id: c.id,
        subscriberName: c.name || '',
        subscriberId: c.internetId || '',
        phone: c.cell || c.mobile || '',
        address: c.address || '',
        sublocality: resolveAreaName(areas, c.sublocalityId),
        rechargeDate: c.updatedAt || c.rechargeDate || '',
        amount: Number(c.remainingAmount) || 0,
        status: c.status || 'active',
      }));
  }, [connections, areas]);

  const filteredData = useMemo(() => allRecords.filter((item) => {
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;

    const itemDate = new Date(item.rechargeDate);
    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);
    const dateMatch = itemDate >= from && itemDate <= to;

    return sublocalityMatch && dateMatch;
  }), [allRecords, sublocality, filterFromDate, filterToDate]);

  const totalRecords = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Recharge Date', 'Amount', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName, item.subscriberId, item.phone, item.address, item.sublocality,
      item.rechargeDate, item.amount.toFixed(2), item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expiry-defaulters-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-violet-600', border: 'border-violet-600', headerBg: 'bg-violet-600', rowHover: 'hover:bg-violet-50/50' };
    const columns: InvoiceColumn<RechargeRecord>[] = [
      { header: '#', render: (_: RechargeRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
      { header: 'Subscriber ID', render: (r) => r.subscriberId.slice(0, 8) },
      { header: 'Phone', render: (r) => r.phone },
      { header: 'Address', render: (r) => r.address || '-' },
      { header: 'Sublocality', render: (r) => r.sublocality },
      { header: 'Recharge Date', render: (r) => (r.rechargeDate ? format(new Date(r.rechargeDate), 'dd MMM yyyy') : '-') },
      { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
      { header: 'Status', render: (r) => <span className="capitalize">{r.status}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<RechargeRecord>
          title="EXPIRY DEFAULTERS REPORT"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No expiry defaulter records found for the selected criteria."
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

      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 shadow-sm">
          <BarChartBig className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expiry Defaulters</h1>
          <p className="text-sm text-muted-foreground">View subscribers with outstanding balance</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent no-print" />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Defaulters</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <BarChartBig className="h-5 w-5" />
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
              <BarChartBig className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Section */}
      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Expiry Defaulters History</h2>
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
                No expiry defaulter records found for the selected criteria.
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
                      <TableHead>Recharge Date</TableHead>
                      <TableHead>Amount</TableHead>
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
                        <TableCell>{item.subscriberId.slice(0, 8)}</TableCell>
                        <TableCell>{item.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.address || '---'}</TableCell>
                        <TableCell>{item.sublocality}</TableCell>
                        <TableCell>{item.rechargeDate ? format(new Date(item.rechargeDate), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'overdue' || item.status === 'deactivated' ? 'destructive' : 'default'}>
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
