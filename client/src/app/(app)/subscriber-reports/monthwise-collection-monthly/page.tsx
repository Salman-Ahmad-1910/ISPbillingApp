'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Printer, BarChartBig, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import type { Payment, Connection } from '@/lib/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthCollectionRecord {
  key: string;
  month: string;
  year: string;
  count: number;
  amount: number;
}

export default function MonthWiseCollectionMonthlyPage() {
  const { companyId } = useCompany();

  const { data: payments = [], isLoading: loading } = useGenericQuery<Payment>('billing/payments', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [connectionType, setConnectionType] = useState('both');
  const [showInvoice, setShowInvoice] = useState(false);

  const connTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    (connections as Connection[]).forEach((c: Connection) => {
      if (c.id) map[c.id] = c.connectionType || '';
    });
    return map;
  }, [connections]);

  const allRecords: MonthCollectionRecord[] = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();

    (payments as Payment[]).forEach((p) => {
      const d = new Date(p.paymentDate);
      if (isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) || { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += Number(p.amount) || 0;
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, e]) => {
        const [yr, mth] = key.split('-');
        return {
          key,
          month: MONTH_NAMES[Number(mth) - 1] || mth,
          year: yr,
          count: e.count,
          amount: e.amount,
        };
      });
  }, [payments]);

  const filteredData = useMemo(() => {
    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);

    const counts = new Map<string, number>();
    const amounts = new Map<string, number>();

    (payments as Payment[]).forEach((p) => {
      const connType = connTypeMap[p.subscriberId || ''] || 'internet';
      const typeMatch = connectionType === 'both' || connType === connectionType;
      if (!typeMatch) return;

      const d = new Date(p.paymentDate);
      if (isNaN(d.getTime())) return;
      if (d < from || d > to) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      amounts.set(key, (amounts.get(key) || 0) + (Number(p.amount) || 0));
    });

    return allRecords
      .filter((r) => counts.has(r.key))
      .map((r) => ({ ...r, count: counts.get(r.key) || 0, amount: amounts.get(r.key) || 0 }));
  }, [allRecords, payments, connTypeMap, connectionType, filterFromDate, filterToDate]);

  const totalMonths = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Month', 'Year', 'No. of Collections', 'Total Amount'];
    const rows = filteredData.map((item) => [
      item.month, item.year, item.count, item.amount.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `monthwise-collection-monthly-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
    const columns: InvoiceColumn<MonthCollectionRecord>[] = [
      { header: '#', render: (_: MonthCollectionRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Month', render: (r) => <span className="font-semibold">{r.month}</span> },
      { header: 'Year', render: (r) => r.year },
      { header: 'No. of Collections', align: 'right', render: (r) => r.count },
      { header: 'Total Amount (PKR)', align: 'right', render: (r) => <span className="font-semibold">{r.amount.toLocaleString()}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<MonthCollectionRecord>
          title="MONTH WISE COLLECTION MONTHLY"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No monthly collections found for the selected criteria."
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
        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 shadow-sm">
          <BarChartBig className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Month Wise Collection Monthly</h1>
          <p className="text-sm text-muted-foreground">Monthly collected money from all subscribers in a single entry per month</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-indigo-500/50 via-blue-500/30 to-transparent no-print" />

      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Months</p>
              <p className="text-2xl font-bold mt-1">{totalMonths}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <BarChartBig className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <BarChartBig className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

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
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
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
                <h2 className="text-xl font-bold">Month Wise Collection Monthly List</h2>
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
                No monthly collections found for the selected criteria.
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>No. of Collections</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.key}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{item.month}</TableCell>
                        <TableCell>{item.year}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">PKR {item.amount.toLocaleString()}</TableCell>
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
