'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Printer, Wallet, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface CollectionRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  billId: string;
  amount: number;
  collectionDate: string;
  receivingDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
}

export default function UserCollectionPage() {
  const { companyId } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: payments = [], isLoading: loading } = useGenericQuery<any>('billing/payments', companyId ?? undefined);

  // Filter state
  const [billId, setBillId] = useState('');
  const [receivingDate, setReceivingDate] = useState<Date | undefined>();
  const [receivingDateOpen, setReceivingDateOpen] = useState(false);
  const [address, setAddress] = useState('');

  // Date range
  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  // Dropdowns
  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [selectedUser, setSelectedUser] = useState('all');

  // Collection History date range
  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(new Date());
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  // Map API payments to collection records
  const data: CollectionRecord[] = payments.map((p: any) => ({
    id: p.id,
    subscriberName: p.subscriberName || p.subscriber?.name || '',
    subscriberId: p.subscriberId || '',
    billId: p.invoiceId || p.id?.slice(0, 8) || '',
    amount: Number(p.amount) || 0,
    collectionDate: p.paymentDate || p.createdAt || '',
    receivingDate: p.paymentDate || p.createdAt || '',
    address: p.subscriber?.installationAddress || '',
    sublocality: p.subscriber?.areaName || '',
    connectionType: p.subscriber?.connectionType || 'internet',
    collectedBy: p.collectorId || p.method || '',
  }));

  const filteredData = data.filter((item) => {
    const itemDate = new Date(item.collectionDate);
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = itemDate >= from;
    const beforeTo = itemDate <= to;
    const typeMatch = reportType === 'all' || item.connectionType === reportType;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const userMatch = selectedUser === 'all' || item.collectedBy === selectedUser;
    const billMatch = !billId || item.billId.toLowerCase().includes(billId.toLowerCase());
    const addressMatch = !address || item.address.toLowerCase().includes(address.toLowerCase());
    const receivingDateMatch = !receivingDate ||
      format(new Date(item.receivingDate), 'yyyy-MM-dd') === format(receivingDate, 'yyyy-MM-dd');

    return afterFrom && beforeTo && typeMatch && connectionMatch &&
      sublocalityMatch && userMatch && billMatch && addressMatch && receivingDateMatch;
  });

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalRecords = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Bill ID', 'Amount', 'Collection Date', 'Receiving Date', 'Address', 'Connection Type', 'Collected By'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.billId,
      item.amount.toFixed(2),
      item.collectionDate,
      item.receivingDate,
      item.address,
      item.connectionType,
      item.collectedBy,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `user-collection-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Collection Reports</h1>
            <p className="text-sm text-muted-foreground">View and manage user collections</p>
          </div>
        </div>

        {/* Right side filters */}
        <div className="flex items-center gap-4">
          <div className="w-48">
            <Input
              placeholder="By Bill ID"
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Popover open={receivingDateOpen} onOpenChange={setReceivingDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !receivingDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {receivingDate ? format(receivingDate, 'PPP') : 'By Receiving Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={receivingDate}
                  onSelect={(date) => {
                    setReceivingDate(date);
                    setReceivingDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-48">
            <Input
              placeholder="By Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
      </div>

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

            {/* Report Type */}
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

            {/* Sublocality */}
            <div className="space-y-2">
              <Label>Sublocality</Label>
              <Select value={sublocality} onValueChange={setSublocality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sublocality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
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

            {/* Users */}
            <div className="space-y-2">
              <Label>Users</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => {}} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Collection History */}
      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Collection History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All user collections records
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

            {/* Summary */}
            <div className="flex justify-between items-center mb-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">Pkr {totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No collection records found for the selected criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Subscriber Name</TableHead>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Receiving Date</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Connection Type</TableHead>
                    <TableHead>Collected By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.subscriberName}</TableCell>
                      <TableCell>{item.billId}</TableCell>
                      <TableCell>Pkr {item.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{item.collectionDate}</TableCell>
                      <TableCell>{item.receivingDate}</TableCell>
                      <TableCell>{item.address}</TableCell>
                      <TableCell>{item.connectionType}</TableCell>
                      <TableCell>{item.collectedBy}</TableCell>
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
