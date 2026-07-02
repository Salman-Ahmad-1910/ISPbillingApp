'use client';

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, HandCoins, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface MonthCollectionRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  billId: string;
  amount: number;
  generatedMonth: string;
  collectionMonth: string;
  collectionDate: string;
  receivingDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
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

export default function MonthlyCollectionsPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: payments = [], isLoading: loading } = useGenericQuery<any>('billing/payments', companyId ?? undefined);

  const [sortBy, setSortBy] = useState('bill_id');
  const [generatedMonth, setGeneratedMonth] = useState('');
  const [collectionMonth, setCollectionMonth] = useState('');
  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [selectedUser, setSelectedUser] = useState('all');

  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(new Date());
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  const allRecords: MonthCollectionRecord[] = useMemo(() => {
    return payments.map((p: any) => {
      const paymentDate = p.paymentDate || p.createdAt || '';
      const pm = paymentDate ? String(new Date(paymentDate).getMonth() + 1) : '';
      const gm = p.invoiceMonth || pm;
      return {
        id: p.id,
        subscriberName: p.subscriberName || p.subscriber?.name || '',
        subscriberId: p.subscriberId || '',
        billId: p.invoiceId || p.id?.slice(0, 8) || '',
        amount: Number(p.amount) || 0,
        generatedMonth: gm,
        collectionMonth: pm,
        collectionDate: paymentDate,
        receivingDate: paymentDate,
        address: p.subscriber?.installationAddress || '',
        sublocality: p.subscriber?.areaName || '',
        connectionType: p.subscriber?.connectionType || 'internet',
        collectedBy: p.collectorId || p.method || '',
        status: p.status || 'paid',
      };
    });
  }, [payments]);

  const sublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (r.sublocality) set.add(r.sublocality);
    });
    return Array.from(set);
  }, [allRecords]);

  const users = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (r.collectedBy) set.add(r.collectedBy);
    });
    return Array.from(set);
  }, [allRecords]);

  const sortedRecords = useMemo(() => {
    const sorted = [...allRecords];
    if (sortBy === 'bill_id') {
      sorted.sort((a, b) => a.billId.localeCompare(b.billId));
    } else if (sortBy === 'receiving_date') {
      sorted.sort((a, b) => new Date(a.receivingDate).getTime() - new Date(b.receivingDate).getTime());
    }
    return sorted;
  }, [allRecords, sortBy]);

  const filteredData = sortedRecords.filter((item) => {
    const gmMatch = !generatedMonth || item.generatedMonth === generatedMonth;
    const cmMatch = !collectionMonth || item.collectionMonth === collectionMonth;
    const typeMatch = reportType === 'all' || item.status === reportType;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
    const userMatch = selectedUser === 'all' || item.collectedBy === selectedUser;

    const itemDate = new Date(item.collectionDate);
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);
    const dateMatch = itemDate >= from && itemDate <= to;

    return gmMatch && cmMatch && typeMatch && sublocalityMatch && connectionMatch && userMatch && dateMatch;
  });

  const totalConnections = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Bill ID', 'Amount', 'Generated Month', 'Collection Month', 'Collection Date', 'Receiving Date', 'Address', 'Sublocality', 'Connection Type', 'Collected By', 'Status'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.billId,
      item.amount.toFixed(2),
      months.find((m) => m.value === item.generatedMonth)?.label || item.generatedMonth,
      months.find((m) => m.value === item.collectionMonth)?.label || item.collectionMonth,
      item.collectionDate,
      item.receivingDate,
      item.address,
      item.sublocality,
      item.connectionType,
      item.collectedBy,
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `month-wise-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <HandCoins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Month Wise Collection</h1>
            <p className="text-sm text-muted-foreground">View and manage monthly collections</p>
          </div>
        </div>
        <div className="w-48">
          <Label>Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent portal={false}>
              <SelectItem value="bill_id">By Bill ID</SelectItem>
              <SelectItem value="receiving_date">Receiving date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Generated Month</Label>
              <Select value={generatedMonth} onValueChange={setGeneratedMonth}>
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
              <Label>Collection Month</Label>
              <Select value={collectionMonth} onValueChange={setCollectionMonth}>
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
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
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
              <Label>Users</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user} value={user}>{user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex mt-4">
            <Button disabled={loading} className="w-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Show
            </Button>
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
            <h2 className="text-xl font-bold mb-4">Month Wise Collection History</h2>

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
                No month wise collection records found for the selected criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Subscriber Name</TableHead>
                    <TableHead>Subscriber ID</TableHead>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Generated Month</TableHead>
                    <TableHead>Collection Month</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Receiving Date</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Sublocality</TableHead>
                    <TableHead>Connection Type</TableHead>
                    <TableHead>Collected By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.subscriberName}</TableCell>
                      <TableCell>{item.subscriberId}</TableCell>
                      <TableCell>{item.billId}</TableCell>
                      <TableCell>Pkr {item.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{months.find((m) => m.value === item.generatedMonth)?.label || '-'}</TableCell>
                      <TableCell>{months.find((m) => m.value === item.collectionMonth)?.label || '-'}</TableCell>
                      <TableCell>{item.collectionDate ? format(new Date(item.collectionDate), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>{item.receivingDate ? format(new Date(item.receivingDate), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>{item.address}</TableCell>
                      <TableCell>{item.sublocality}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.connectionType}</Badge>
                      </TableCell>
                      <TableCell>{item.collectedBy || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'overdue' ? 'destructive' : item.status === 'pending' ? 'secondary' : 'default'}>
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
