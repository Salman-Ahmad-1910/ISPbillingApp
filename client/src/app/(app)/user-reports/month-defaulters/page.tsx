'use client';

import { useState, useRef, useMemo } from 'react';
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

interface MonthDefaulterRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  month: string;
  amount: number;
  status: string;
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

export default function MonthDefaultersPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: subscribers = [], isLoading: loading } = useGenericQuery<any>('subscribers', companyId ?? undefined);

  const [month, setMonth] = useState('');
  const [sublocality, setSublocality] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(new Date());
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  const sublocalities = useMemo(() => {
    const set = new Set<string>();
    subscribers.forEach((s: any) => {
      if (s.areaName) set.add(s.areaName);
    });
    return Array.from(set);
  }, [subscribers]);

  const allRecords: MonthDefaulterRecord[] = useMemo(() => {
    return subscribers
      .filter((s: any) => Number(s.balance) > 0)
      .map((s: any) => {
        const connectionDate = s.connectionDate || s.updatedAt || '';
        const recordMonth = connectionDate ? String(new Date(connectionDate).getMonth() + 1) : '';
        return {
          id: s.id,
          subscriberName: s.name || '',
          subscriberId: s.subscriber_identity || '',
          phone: s.phone || '',
          address: s.installationAddress || '',
          sublocality: s.areaName || '',
          connectionType: s.connectionType || 'internet',
          month: recordMonth,
          amount: Number(s.balance) || 0,
          status: s.status || 'active',
        };
      });
  }, [subscribers]);

  const filteredData = allRecords.filter((item) => {
    const monthMatch = !month || item.month === month;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const typeMatch = reportType === 'all' || item.status === reportType;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

    const itemDate = new Date(item.month ? `2024-${item.month}-01` : '');
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);

    return monthMatch && sublocalityMatch && typeMatch && connectionMatch;
  });

  const totalConnections = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Month', 'Amount', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.phone,
      item.address,
      item.sublocality,
      item.connectionType,
      months.find((m) => m.value === item.month)?.label || item.month,
      item.amount.toFixed(2),
      item.status,
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

      <div className="flex items-center gap-3 no-print">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Month Wise Defaulters</h1>
          <p className="text-sm text-muted-foreground">View and manage month wise defaulters</p>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
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

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="tv_cable">Cable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button disabled={loading} className="w-40">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Show
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Connection</p>
          <p className="text-2xl font-bold">{totalConnections}</p>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold text-green-600">
            Pkr {totalAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Month Wise Defaulters History</h2>

            <div className="flex items-center gap-4 mb-6">
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
              <div className="flex gap-2 no-print ml-auto">
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
                      <TableCell className="font-medium">{item.subscriberName}</TableCell>
                      <TableCell>{item.subscriberId}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.address}</TableCell>
                      <TableCell>{item.sublocality}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.connectionType}</Badge>
                      </TableCell>
                      <TableCell>{months.find((m) => m.value === item.month)?.label || '-'}</TableCell>
                      <TableCell>Pkr {item.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'overdue' || item.status === 'deactivated' ? 'destructive' : 'default'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
