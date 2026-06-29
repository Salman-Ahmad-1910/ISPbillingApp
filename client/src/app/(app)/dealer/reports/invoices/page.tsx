'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Printer, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface SubscriberData {
  id: string;
  subscriber_identity: string;
  name: string;
  cnic: string;
  installationAddress: string;
  balance: number;
  dealerId: string | null;
}

interface InvoiceData {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  dueDate: string;
  status: string;
  billingPeriod: string;
  createdAt: string;
}

interface CombinedRow {
  subscriberId: string;
  subscriberIdentity: string;
  dealerId: string | null;
  cnic: string;
  name: string;
  address: string;
  balance: number;
  invoiceId: string;
  invoiceAmount: number;
  invoiceDueDate: string;
  invoiceStatus: string;
  invoiceBillingPeriod: string;
  invoiceDate: string;
}

export default function DealersInvoiceListPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CombinedRow[]>([]);

  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<string>('10');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [subscribersRes, invoicesRes] = await Promise.all([
        api.get('/billing/subscribers', { params: { companyId } }),
        api.get('/billing/invoices', { params: { companyId } }),
      ]);

      const subscribers: SubscriberData[] = subscribersRes.data?.data || [];
      const invoices: InvoiceData[] = invoicesRes.data?.data || [];

      const subscriberMap = new Map<string, SubscriberData>();
      subscribers.forEach((s) => subscriberMap.set(s.id, s));

      const combined: CombinedRow[] = [];
      invoices.forEach((inv) => {
        const sub = subscriberMap.get(inv.subscriberId);
        combined.push({
          subscriberId: sub?.id || inv.subscriberId,
          subscriberIdentity: sub?.subscriber_identity || inv.subscriberId.slice(0, 8),
          dealerId: sub?.dealerId || null,
          cnic: sub?.cnic || '-',
          name: sub?.name || inv.subscriberName || '-',
          address: sub?.installationAddress || '-',
          balance: sub?.balance ?? 0,
          invoiceId: inv.id,
          invoiceAmount: inv.amount,
          invoiceDueDate: inv.dueDate,
          invoiceStatus: inv.status,
          invoiceBillingPeriod: inv.billingPeriod,
          invoiceDate: inv.createdAt,
        });
      });

      setRows(combined);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const filteredData = useMemo(() => {
    return rows.filter((row) => {
      const invDate = new Date(row.invoiceDate);
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      return invDate >= from && invDate <= to;
    });
  }, [rows, fromDate, toDate]);

  const pageSize = parseInt(entries, 10);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [safePage]);

  const totalAmount = filteredData.reduce((sum, r) => sum + r.invoiceAmount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) {
      toast({ title: 'No data', description: 'No records to export.' });
      return;
    }

    const headers = ['Customer ID', 'Dealer ID', 'CNIC', 'Name', 'Address', 'Balance', 'Invoice Amount'];
    const csvRows = filteredData.map((item) => [
      item.subscriberIdentity,
      item.dealerId || '-',
      item.cnic,
      item.name,
      `"${item.address.replace(/"/g, '""')}"`,
      item.balance.toFixed(2),
      item.invoiceAmount.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dealers-invoice-list-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Success', description: 'Report exported successfully.' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-report,
          .print-report * {
            visibility: visible;
          }
          .print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dealers Invoice List</h1>
          <p className="text-sm text-muted-foreground">View invoices issued by dealers</p>
        </div>
      </div>

      {/* Filter Row */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* From Date */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      if (date) {
                        setFromDate(date);
                        setFromDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      if (date) {
                        setToDate(date);
                        setToDateOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Entries */}
            <div className="space-y-2">
              <Label>Entries</Label>
              <Select value={entries} onValueChange={(v) => { setEntries(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entries" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Apply */}
            <div className="space-y-2 flex items-end">
              <Button onClick={fetchData} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{filteredData.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">Pkr {totalAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Section */}
      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Dealer&apos;s Invoice List</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {fromDate ? format(fromDate, 'dd MMM yyyy') : '...'} : To:{' '}
                  {toDate ? format(toDate, 'dd MMM yyyy') : '...'}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={exportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading data...</div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoice records found for the selected criteria.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Customer ID</TableHead>
                      <TableHead>Dealer ID</TableHead>
                      <TableHead>CNIC</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Invoice of the Customer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, i) => (
                      <TableRow key={item.invoiceId}>
                        <TableCell className="text-muted-foreground">{(safePage - 1) * pageSize + i + 1}</TableCell>
                        <TableCell className="font-medium">{item.subscriberIdentity}</TableCell>
                        <TableCell>{item.dealerId ? item.dealerId.slice(0, 8) + '...' : '-'}</TableCell>
                        <TableCell>{item.cnic}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.address}</TableCell>
                        <TableCell>Pkr {item.balance.toLocaleString('en-IN')}</TableCell>
                        <TableCell>Pkr {item.invoiceAmount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 no-print">
                  <p className="text-sm text-muted-foreground">
                    Showing {(safePage - 1) * pageSize + 1} to{' '}
                    {Math.min(safePage * pageSize, filteredData.length)} of {filteredData.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
