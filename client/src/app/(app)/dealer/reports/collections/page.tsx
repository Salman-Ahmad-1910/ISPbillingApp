'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, Wallet, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';
import Image from 'next/image';

interface CollectionRecord {
  id: string;
  dealerId: string;
  dealerName: string;
  dealerAddress: string;
  amount: number;
  collectionDate: string;
  settlementStatus: string;
  transactionType: string;
  comment: string;
  receivedById: string;
  receivedByName: string;
}

interface AreaItem {
  id: string;
  name: string;
}

export default function DealersCollectionsPage() {
  const { companyId, companies } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CollectionRecord[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');

  const currentCompany = companies.find((c: any) => c.id === companyId) as Company | undefined;

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [collectionsRes, areasRes] = await Promise.all([
        api.get('/dealers/collections', { params: { companyId } }),
        api.get('/network/areas', { params: { companyId } }),
      ]);

      setData(collectionsRes.data?.data || []);
      const areaList = areasRes.data?.data || [];
      setAreas(areaList.map((a: any) => ({ id: a.id, name: a.locality || a.name })));
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

  const filteredData = data.filter((item) => {
    const itemDate = new Date(item.collectionDate);
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = itemDate >= from;
    const beforeTo = itemDate <= to;
    const typeMatch = reportType === 'all' || item.settlementStatus === reportType;
    const txMatch = selectedTransactionType === 'all' || item.transactionType === selectedTransactionType;

    return afterFrom && beforeTo && typeMatch && txMatch;
  });

  const totalConnection = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const handlePrintBill = () => {
    if (filteredData.length === 0) {
      toast({ title: 'No data', description: 'No records to print.' });
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    const rows = filteredData.map((item, i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:center;">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${item.dealerName}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${item.dealerAddress || '---'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">PKR ${item.amount.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.transactionType || 'cash'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.collectionDate}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${item.receivedByName || '---'}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;${item.settlementStatus === 'settled' ? 'background:#d1fae5;color:#065f46;' : 'background:#fef3c7;color:#92400e;'}">${item.settlementStatus === 'settled' ? 'Paid' : 'Unpaid'}</span>
        </td>
      </tr>
    `).join('');

    const logoHTML = currentCompany?.logo
      ? `<img src="${currentCompany.logo}" style="height:50px;width:50px;object-fit:contain;" />`
      : '';

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dealer Collection Bill</title>
          ${styles}
          <style>
            body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            @page { size: A4; margin: 10mm; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div style="max-width:100%;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111;">
              <div style="display:flex;align-items:center;gap:16px;">
                ${logoHTML}
                <div>
                  <h1 style="font-size:22px;font-weight:700;margin:0;color:#111;">${currentCompany?.name || 'Company Name'}</h1>
                  <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">${currentCompany?.address || ''}</p>
                  ${currentCompany?.email ? `<p style="font-size:13px;color:#9ca3af;margin:2px 0 0;">${currentCompany.email}</p>` : ''}
                  ${currentCompany?.contact1 ? `<p style="font-size:13px;color:#9ca3af;margin:2px 0 0;">${currentCompany.contact1}</p>` : ''}
                </div>
              </div>
              <div style="text-align:right;">
                <h2 style="font-size:18px;font-weight:700;margin:0;color:#059669;">DEALER COLLECTION BILL</h2>
                <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">From: ${fromDate ? format(fromDate, 'dd MMM yyyy') : '...'}</p>
                <p style="font-size:13px;color:#6b7280;margin:2px 0 0;">To: ${toDate ? format(toDate, 'dd MMM yyyy') : '...'}</p>
              </div>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;color:#374151;">#</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Dealer Name</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Address</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:right;font-weight:600;color:#374151;">Amount</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;color:#374151;">Type</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;color:#374151;">Date</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Received By</th>
                  <th style="padding:10px 8px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;color:#374151;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div style="display:flex;justify-content:space-between;padding:16px;background:#f9fafb;border-radius:8px;margin-bottom:24px;">
              <div style="text-align:center;padding:12px 24px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;">
                <p style="font-size:12px;color:#6b7280;margin:0 0 4px;">Total Records</p>
                <p style="font-size:20px;font-weight:700;margin:0;">${totalConnection}</p>
              </div>
              <div style="text-align:center;padding:12px 24px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;">
                <p style="font-size:12px;color:#6b7280;margin:0 0 4px;">Total Amount</p>
                <p style="font-size:20px;font-weight:700;margin:0;color:#059669;">PKR ${totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div style="border-top:1px solid #d1d5db;padding-top:16px;text-align:center;">
              <p style="font-size:13px;font-weight:600;color:#374151;margin:0;">${currentCompany?.name || 'Company Name'}</p>
              <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">${currentCompany?.address || ''}</p>
              <p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">This is a computer-generated bill. No signature required.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const exportExcel = () => {
    if (filteredData.length === 0) {
      toast({ title: 'No data', description: 'No records to export.' });
      return;
    }

    const headers = ['Dealer Name', 'Address', 'Amount', 'Transaction Type', 'Collection Date', 'Status', 'Received By'];
    const rows = filteredData.map((item) => [
      item.dealerName,
      item.dealerAddress || '',
      item.amount.toFixed(2),
      item.transactionType || 'cash',
      item.collectionDate,
      item.settlementStatus,
      item.receivedByName || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dealers-collection-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Success', description: 'Report exported successfully.' });
  };

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dealers Collections</h1>
          <p className="text-sm text-muted-foreground">View collections made by dealers</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-teal-500/50 via-emerald-500/30 to-transparent no-print" />

      {/* Filter Row */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Locality */}
            <div className="space-y-2">
              <Label>Locality</Label>
              <Select value={selectedLocality} onValueChange={setSelectedLocality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select locality" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Localities</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="easypaisa">Easypaisa</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchData} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold mt-1">{totalConnection}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
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
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Section */}
      <div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Dealer&apos;s Collection</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {fromDate ? format(fromDate, 'dd MMM yyyy') : '...'} : To:{' '}
                  {toDate ? format(toDate, 'dd MMM yyyy') : '...'}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" onClick={handlePrintBill}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Bill
                </Button>
                <Button variant="outline" onClick={exportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm animate-pulse">Loading data...</p>
                </div>
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
                    <TableHead>Dealer Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.dealerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.dealerAddress || '---'}</TableCell>
                      <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.transactionType === 'easypaisa' ? 'default' :
                          item.transactionType === 'jazzcash' ? 'secondary' :
                          item.transactionType === 'bank' ? 'outline' : 'default'
                        }>
                          {item.transactionType || 'cash'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.collectionDate}</TableCell>
                      <TableCell className="text-xs">{item.receivedByName || '---'}</TableCell>
                      <TableCell>
                        <Badge variant={item.settlementStatus === 'settled' ? 'default' : 'secondary'}>
                          {item.settlementStatus === 'settled' ? 'Paid' : 'Unpaid'}
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
