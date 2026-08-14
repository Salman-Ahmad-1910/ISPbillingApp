'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, FileText, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import { SUBSCRIBER_REPORT_TYPE_OPTIONS, matchesReportType, type ReportTypeConn } from '@/lib/subscriber-report-types';

interface MonthDefaulterRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  month: string;
  recordDate: string;
  amount: number;
  status: string;
}

function resolveAreaName(areas: any[], sublocalityId?: string): string {
  if (!sublocalityId) return '';
  const area = areas.find((a: any) => a.id === sublocalityId);
  if (!area) return '';
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
}

const months = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function parseBillingPeriod(billingPeriod?: string): Date | null {
  if (!billingPeriod) return null;
  const match = billingPeriod.match(/^([a-zA-Z]+)\s+(\d{4})/);
  if (!match) return null;
  const monthIdx = months.findIndex((m) => m.label.toLowerCase() === match[1].toLowerCase());
  if (monthIdx === -1) return null;
  return new Date(Number(match[2]), monthIdx, 1);
}

export default function MonthDefaultersPage() {
  const { companyId } = useCompany();

  const { data: invoices = [], isLoading: loading } = useGenericQuery<any>('billing/invoices', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<any>('admin/connections', companyId ?? undefined);
  const { data: areas = [] } = useGenericQuery<any>('network/areas', companyId ?? undefined);

  const [month, setMonth] = useState('');
  const [sublocality, setSublocality] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [showInvoice, setShowInvoice] = useState(false);

  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(new Date());
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv: any) => {
      const conn = connections.find((c: any) => c.id === inv.subscriberId);
      const areaName = resolveAreaName(areas, conn?.sublocalityId);
      if (areaName) set.add(areaName);
    });
    return Array.from(set);
  }, [invoices, connections, areas]);

  const allRecords: MonthDefaulterRecord[] = useMemo(() => {
    return invoices
      .filter((inv: any) => Number(inv.remainingAmount) > 0)
      .map((inv: any) => {
        const conn = connections.find((c: any) => c.id === inv.subscriberId);
        const monthName = String(inv.billingPeriod || '').split(' ')[0];
        const monthValue = months.find((m) => m.label.toLowerCase() === monthName.toLowerCase())?.value || '';
        const periodDate = parseBillingPeriod(inv.billingPeriod);
        return {
          id: inv.id,
          subscriberName: inv.subscriberName || conn?.name || '',
          subscriberId: conn?.internetId || '',
          phone: conn?.cell || conn?.mobile || '',
          address: conn?.address || '',
          sublocality: resolveAreaName(areas, conn?.sublocalityId),
          connectionType: conn?.connectionType || 'internet',
          month: monthValue,
          recordDate: periodDate ? periodDate.toISOString() : '',
          amount: Number(inv.remainingAmount) || 0,
          status: conn?.status || inv.status || 'active',
        };
      });
  }, [invoices, connections, areas]);

  const connById = useMemo(() => {
    const map = new Map<string, ReportTypeConn>();
    connections.forEach((c: any) => map.set(c.id, c));
    return map;
  }, [connections]);

  const filteredData = useMemo(() => {
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);

    return allRecords.filter((item) => {
      const monthMatch = !month || item.month === month;
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

      const itemDate = item.recordDate ? new Date(item.recordDate) : new Date(0);
      if (isNaN(itemDate.getTime())) return false;
      const typeMatch = matchesReportType({ reportType, itemDate, conn: connById.get(item.id), from, to });

      return monthMatch && sublocalityMatch && typeMatch && connectionMatch;
    });
  }, [allRecords, month, sublocality, reportType, connectionType, historyFromDate, historyToDate, connById]);

  const totalConnections = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Month', 'Amount', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName, item.subscriberId, item.phone, item.address, item.sublocality,
      item.connectionType, months.find((m) => m.value === item.month)?.label || item.month,
      item.amount.toFixed(2), item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `month-wise-defaulters-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-indigo-600', border: 'border-indigo-600', headerBg: 'bg-indigo-600', rowHover: 'hover:bg-indigo-50/50' };
    const columns: InvoiceColumn<MonthDefaulterRecord>[] = [
      { header: '#', render: (_: MonthDefaulterRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
      { header: 'Subscriber ID', render: (r) => r.subscriberId.slice(0, 8) },
      { header: 'Phone', render: (r) => r.phone },
      { header: 'Address', render: (r) => r.address || '-' },
      { header: 'Sublocality', render: (r) => r.sublocality },
      { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType}</span> },
      { header: 'Month', render: (r) => months.find((m) => m.value === r.month)?.label || '-' },
      { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
      { header: 'Status', render: (r) => <span className="capitalize">{r.status}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<MonthDefaulterRecord>
          title="MONTH WISE DEFAULTERS REPORT"
          subtitle={`From: ${format(historyFromDate, 'dd MMM yyyy')} — To: ${format(historyToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No month wise defaulters found for the selected criteria."
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
        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 shadow-sm">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Month Wise Defaulters</h1>
          <p className="text-sm text-muted-foreground">View and manage month wise defaulters</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-indigo-500/50 via-blue-500/30 to-transparent no-print" />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Connections</p>
              <p className="text-2xl font-bold mt-1">{totalConnections}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={historyFromDateOpen} onOpenChange={setHistoryFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !historyFromDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {historyFromDate ? format(historyFromDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={historyFromDate} onSelect={(date) => { if (date) { setHistoryFromDate(date); setHistoryFromDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={historyToDateOpen} onOpenChange={setHistoryToDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !historyToDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {historyToDate ? format(historyToDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={historyToDate} onSelect={(date) => { if (date) { setHistoryToDate(date); setHistoryToDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent portal={false}>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent portal={false}>
                  {SUBSCRIBER_REPORT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                  <SelectItem value="tv_cable">Cable</SelectItem>
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
                <h2 className="text-xl font-bold">Month Wise Defaulters History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {format(historyFromDate, 'dd MMM yyyy')} — To: {format(historyToDate, 'dd MMM yyyy')}
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
                No month wise defaulters found for the selected criteria.
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
                      <TableHead>Month</TableHead>
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
                        <TableCell>
                          <Badge variant="outline">{item.connectionType}</Badge>
                        </TableCell>
                        <TableCell>{months.find((m) => m.value === item.month)?.label || '-'}</TableCell>
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
