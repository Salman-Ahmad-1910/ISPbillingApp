'use client';

import { useState, useRef, useMemo } from 'react';
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

interface RechargeRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  phone: string;
  address: string;
  sublocality: string;
  dateType: string;
  rechargeDate: string;
  amount: number;
  status: string;
}

export default function ExpiryDefaultersPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: subscribers = [], isLoading: loading } = useGenericQuery<any>('subscribers', companyId ?? undefined);
  const { data: boxes = [] } = useGenericQuery<any>('network/boxes', companyId ?? undefined);

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [dateType, setDateType] = useState('');
  const [sublocality, setSublocality] = useState('all');
  const [boxNumber, setBoxNumber] = useState('');

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

  const allRecords: RechargeRecord[] = subscribers
    .filter((s: any) => Number(s.balance) > 0)
    .map((s: any) => ({
      id: s.id,
      subscriberName: s.name || '',
      subscriberId: s.subscriber_identity || '',
      phone: s.phone || '',
      address: s.installationAddress || '',
      sublocality: s.areaName || '',
      dateType: '',
      rechargeDate: s.updatedAt || s.connectionDate || '',
      amount: Number(s.balance) || 0,
      status: s.status || 'active',
    }));

  const filteredData = allRecords.filter((item) => {
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;

    const itemDate = new Date(item.rechargeDate);
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);
    const dateMatch = itemDate >= from && itemDate <= to;

    return sublocalityMatch && dateMatch;
  });

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Phone', 'Address', 'Sublocality', 'Recharge Date', 'Amount', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.phone,
      item.address,
      item.sublocality,
      item.rechargeDate,
      item.amount.toFixed(2),
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `recharge-date-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 shadow-sm">
          <BarChartBig className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Recharge Date Reports</h1>
          <p className="text-sm text-muted-foreground">View and manage recharge date reports</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-violet-500/30 via-purple-500/30 to-transparent" />

      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            <div className="space-y-2">
              <Label>Date Type</Label>
              <Select value={dateType} onValueChange={setDateType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="by_install_date">By Install Date</SelectItem>
                  <SelectItem value="by_recharge_date">By Recharge Date</SelectItem>
                  <SelectItem value="by_expiry_date">By Expiry Date</SelectItem>
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
              <Label>Box Number</Label>
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
          </div>

          <div className="flex mt-4">
            <Button disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700 w-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Show
            </Button>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Recharge Date History</h2>

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
                No recharge date records found for the selected criteria.
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
                        <TableCell className="font-medium">{item.subscriberName}</TableCell>
                        <TableCell>{item.subscriberId}</TableCell>
                        <TableCell>{item.phone}</TableCell>
                        <TableCell>{item.address}</TableCell>
                        <TableCell>{item.sublocality}</TableCell>
                        <TableCell>{item.rechargeDate ? format(new Date(item.rechargeDate), 'dd MMM yyyy') : '-'}</TableCell>
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
