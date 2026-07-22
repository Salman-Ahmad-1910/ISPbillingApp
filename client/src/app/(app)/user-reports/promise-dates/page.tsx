'use client';

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, CalendarClock, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface PromiseRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  promiseDate: string;
  promiseType: string;
  amount: number;
  status: string;
  remarks: string;
}

export default function PromiseDateReportsPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: subscribers = [], isLoading: loading } = useGenericQuery<any>('subscribers', companyId ?? undefined);

  // Filter state
  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [sublocality, setSublocality] = useState('all');
  const [promiseType, setPromiseType] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  // History date range
  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(new Date());
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  // Extract sublocalities
  const sublocalities = useMemo(() => {
    const set = new Set<string>();
    subscribers.forEach((s: any) => {
      if (s.areaName) set.add(s.areaName);
    });
    return Array.from(set);
  }, [subscribers]);

  // Build promise records from subscriber data (those with overdue balances)
  const promiseData: PromiseRecord[] = useMemo(() => {
    return subscribers
      .filter((s: any) => s.status === 'active' || s.status === 'suspended')
      .map((s: any) => ({
        id: s.id,
        subscriberName: s.name || '',
        subscriberId: s.subscriber_identity || '',
        phone: s.phone || '',
        address: s.installationAddress || '',
        sublocality: s.areaName || '',
        connectionType: s.connectionType || 'internet',
        promiseDate: s.updatedAt || s.connectionDate || '',
        promiseType: s.balance && Number(s.balance) > 0 ? 'payment' : 'other',
        amount: Number(s.balance) || 0,
        status: s.status === 'active' ? 'pending' : 'overdue',
        remarks: '',
      }));
  }, [subscribers]);

  const filteredData = promiseData.filter((item) => {
    const itemDate = new Date(item.promiseDate);
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = itemDate >= from;
    const beforeTo = itemDate <= to;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const promiseTypeMatch = promiseType === 'all' || item.promiseType === promiseType;
    const typeMatch = reportType === 'all' || item.status === reportType;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

    return afterFrom && beforeTo && sublocalityMatch && promiseTypeMatch && typeMatch && connectionMatch;
  });

  const totalReceivable = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalDefaulters = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Promise Date', 'Promise Type', 'Amount', 'Status', 'Remarks'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.phone,
      item.address,
      item.sublocality,
      item.connectionType,
      item.promiseDate,
      item.promiseType,
      item.amount.toFixed(2),
      item.status,
      item.remarks,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `promise-date-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

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
        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 p-2.5 shadow-sm">
          <CalendarClock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">Promise Date Reports</h1>
          <p className="text-sm text-muted-foreground">View and manage promise date records</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-cyan-500/30 via-teal-500/30 to-transparent" />

      {/* Filter Row */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* From Date */}
            <div className="space-y-2">
              <Label>From</Label>
              <Popover open={filterFromDateOpen} onOpenChange={setFilterFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filterFromDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterFromDate ? format(filterFromDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterFromDate}
                    onSelect={(date) => {
                      if (date) {
                        setFilterFromDate(date);
                        setFilterFromDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label>To</Label>
              <Popover open={filterToDateOpen} onOpenChange={setFilterToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filterToDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterToDate ? format(filterToDate, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterToDate}
                    onSelect={(date) => {
                      if (date) {
                        setFilterToDate(date);
                        setFilterToDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sublocality */}
            <div className="space-y-2">
              <Label>Sublocality</Label>
              <Select value={sublocality} onValueChange={setSublocality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sublocality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {sublocalities.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Promise Type */}
            <div className="space-y-2">
              <Label>Promise Type</Label>
              <Select value={promiseType} onValueChange={setPromiseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Connection Type */}
            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="tv_cable">TV Cable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => {}} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Receivable</p>
                <CalendarClock className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
              </div>
              <p className="text-2xl font-bold mt-2">Pkr {totalReceivable.toLocaleString('en-IN')}</p>
            </div>
            <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">No. of Defaulter</p>
                <CalendarClock className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
              </div>
              <p className="text-2xl font-bold mt-2">{totalDefaulters}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promise Date History */}
      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Promise Date History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All promise date records
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-36">
                    <Popover open={historyFromDateOpen} onOpenChange={setHistoryFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-full justify-start text-left font-normal text-xs',
                            !historyFromDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {historyFromDate ? format(historyFromDate, 'dd MMM yyyy') : 'From'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={historyFromDate}
                          onSelect={(date) => {
                            if (date) {
                              setHistoryFromDate(date);
                              setHistoryFromDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <span className="text-muted-foreground text-xs">to</span>
                  <div className="w-36">
                    <Popover open={historyToDateOpen} onOpenChange={setHistoryToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-full justify-start text-left font-normal text-xs',
                            !historyToDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {historyToDate ? format(historyToDate, 'dd MMM yyyy') : 'To'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={historyToDate}
                          onSelect={(date) => {
                            if (date) {
                              setHistoryToDate(date);
                              setHistoryToDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
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
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No promise date records found for the selected criteria.
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
                      <TableHead>Promise Date</TableHead>
                      <TableHead>Promise Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{item.subscriberName}</TableCell>
                        <TableCell>{item.subscriberId}</TableCell>
                        <TableCell>{item.phone}</TableCell>
                        <TableCell>{item.address}</TableCell>
                        <TableCell>{item.sublocality}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.connectionType}</Badge>
                        </TableCell>
                        <TableCell>{item.promiseDate ? format(new Date(item.promiseDate), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.promiseType}</Badge>
                        </TableCell>
                        <TableCell>Pkr {item.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'overdue' ? 'destructive' : 'default'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.remarks || '-'}</TableCell>
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
