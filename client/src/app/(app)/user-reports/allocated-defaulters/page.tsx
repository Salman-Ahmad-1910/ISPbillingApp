'use client';

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, TriangleAlert, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface AllocatedDefaulterRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  allocatedDate: string;
  amount: number;
  status: string;
}

export default function AllocatedDefaultersPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: subscribers = [], isLoading: loading } = useGenericQuery<any>('subscribers', companyId ?? undefined);
  const { data: boxes = [] } = useGenericQuery<any>('network/boxes', companyId ?? undefined);

  const [reportType, setReportType] = useState('defaulter');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [boxNumber, setBoxNumber] = useState('all');

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

  const getDaysSinceUpdate = (updatedAt: string): number => {
    if (!updatedAt) return 0;
    const updateDate = new Date(updatedAt);
    const now = new Date();
    const diffTime = now.getTime() - updateDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const allDefaulters: AllocatedDefaulterRecord[] = useMemo(() => {
    return subscribers
      .filter((s: any) => Number(s.balance) > 0)
      .map((s: any) => ({
        id: s.id,
        subscriberName: s.name || '',
        subscriberId: s.subscriber_identity || '',
        phone: s.phone || '',
        address: s.installationAddress || '',
        sublocality: s.areaName || '',
        connectionType: s.connectionType || 'internet',
        allocatedDate: s.updatedAt || s.connectionDate || '',
        amount: Number(s.balance) || 0,
        status: s.status || 'active',
      }));
  }, [subscribers]);

  const defaultersByType: AllocatedDefaulterRecord[] = useMemo(() => {
    return allDefaulters.filter((item) => {
      const daysSince = getDaysSinceUpdate(item.allocatedDate);
      if (reportType === 'defaulter') return daysSince >= 90;
      if (reportType === 'bad_debt') return daysSince > 90;
      return true;
    });
  }, [allDefaulters, reportType]);

  const filteredData = defaultersByType.filter((item) => {
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

    const itemDate = new Date(item.allocatedDate);
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);
    const dateMatch = itemDate >= from && itemDate <= to;

    return sublocalityMatch && connectionMatch && dateMatch;
  });

  const totalDefaulters = filteredData.length;
  const totalReceivable = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Allocated Date', 'Amount', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.phone,
      item.address,
      item.sublocality,
      item.connectionType,
      item.allocatedDate,
      item.amount.toFixed(2),
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `allocated-defaulters-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 shadow-sm">
          <TriangleAlert className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Allocated Defaulters</h1>
          <p className="text-sm text-muted-foreground">View and manage allocated defaulters</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-transparent" />

      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Select Report</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="defaulter">Defaulter</SelectItem>
                  <SelectItem value="bad_debt">Bad Debt</SelectItem>
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

            <div className="space-y-2">
              <Label>Select Box Number</Label>
              <Select value={boxNumber} onValueChange={setBoxNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select box number" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {boxes.map((box: any) => (
                    <SelectItem key={box.id} value={box.name}>{box.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
                <Button disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Show
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">No of Defaulters</p>
            <TriangleAlert className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalDefaulters}</p>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Receivable</p>
            <TriangleAlert className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
          </div>
          <p className="text-2xl font-bold mt-2">Pkr {totalReceivable.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Defaulters History</h2>

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
                No allocated defaulters found for the selected criteria.
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
                      <TableHead>Allocated Date</TableHead>
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
                        <TableCell>{item.allocatedDate ? format(new Date(item.allocatedDate), 'dd MMM yyyy') : '-'}</TableCell>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
