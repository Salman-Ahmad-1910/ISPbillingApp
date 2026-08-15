'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Printer, Wallet, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import SubscriberSystemDatesTable, { systemDatesExcel, systemDatesInvoiceColumns, type SystemDateRow } from '@/components/shared/subscriber-system-dates';
import SubscriberInternetPackageTable, { internetPackageExcel, internetPackageInvoiceColumns, type InternetPackageRow } from '@/components/shared/subscriber-internet-package';
import SubscriberPackageWiseTable, { packageWiseExcel, packageWiseInvoiceColumns, withPackageExcel, withPackageInvoiceColumns, SubscriberWithPackageTable, buildPackageWiseReport, packageSubscriberCounts, connectionPackageName, type PackageWiseRow } from '@/components/shared/subscriber-package-wise';
import { SUBSCRIBER_REPORT_TYPE_OPTIONS } from '@/lib/subscriber-report-types';
import type { Connection } from '@/lib/types';

interface CollectionRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  internetId: string;
  connectionId: string;
  billId: number;
  amount: number;
  packageAmount: number;
  packageName: string;
  collectionDate: string;
  systemDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
  method: string;
  transactionType: string;
  transactionId: string;
  transactionIds: string[];
  discount: string;
  internetDiscount: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

function parseDateOnly(str: string | undefined | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function inDateRange(date: Date | null, from: Date, to: Date): boolean {
  return !!date && date >= from && date <= to;
}

function hasDiscount(c: Connection): boolean {
  const d = String(c.discount || '').trim();
  const sd = String(c.sameDiscount || '').trim();
  return (d !== '' && d !== 'no_discount') || (sd !== '' && sd !== 'no_discount');
}

function discountLabel(value: string): string {
  const v = String(value || '').trim();
  switch (v) {
    case 'quarter': return 'Quarter';
    case 'half': return 'Half';
    case 'full_free': return 'Full Free';
    case 'custom': return 'Custom';
    case 'no_discount': return 'No Discount';
    default: return v || 'No Discount';
  }
}

function formatConnectionDiscount(record: CollectionRecord): string {
  const parts: string[] = [];
  if (record.discount && record.discount !== 'no_discount') parts.push(`Cable: ${discountLabel(record.discount)}`);
  if (record.internetDiscount && record.internetDiscount !== 'no_discount') parts.push(`Internet: ${discountLabel(record.internetDiscount)}`);
  return parts.join(', ') || 'No Discount';
}

function toSystemDateRow(item: CollectionRecord): SystemDateRow {
  return {
    id: item.id,
    connectionId: item.connectionId || undefined,
    billNo: item.billId > 0 ? item.billId : undefined,
    internetId: item.internetId || undefined,
    name: item.subscriberName,
    address: item.address,
    amount: item.amount,
    receivingDate: item.collectionDate || undefined,
    systemDate: item.systemDate || undefined,
    receivedBy: item.collectedBy || undefined,
    method: item.method || undefined,
  };
}

function toInternetPackageRow(item: CollectionRecord): InternetPackageRow {
  return {
    id: item.id,
    connectionId: item.connectionId || undefined,
    billNo: item.billId > 0 ? item.billId : undefined,
    internetId: item.internetId || undefined,
    name: item.subscriberName,
    address: item.address,
    amount: item.amount,
    receivingDate: item.collectionDate || undefined,
    receivedBy: item.collectedBy || undefined,
    packageAmount: item.packageAmount,
  };
}

function toPackageWiseRow(item: CollectionRecord): PackageWiseRow {
  return {
    id: item.id,
    packageName: item.subscriberName,
    subscriberCount: item.billId,
    totalAmount: item.amount,
  };
}

export default function SubscriberReportPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();

  const { data: payments = [], isLoading: loading, refetch: refetchPayments } = useGenericQuery<any>('billing/payments', companyId ?? undefined);

  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);

  const connectionMap = useMemo(() => {
    const map = new Map<string, Connection>();
    (connections as Connection[]).forEach((c) => map.set(c.id, c));
    return map;
  }, [connections]);

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [selectedUser, setSelectedUser] = useState('all');

  const [showReport, setShowReport] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showAll, setShowAll] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p: any) => {
      const loc = p.areaName;
      if (loc) set.add(loc);
    });
    return Array.from(set);
  }, [payments]);

  const allUsers = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p: any) => {
      const user = p.collectedByName || p.method;
      if (user) set.add(user);
    });
    return Array.from(set);
  }, [payments]);

  const data: CollectionRecord[] = useMemo(() => payments.map((p: any) => {
    const conn = connectionMap.get(p.subscriberId || '') || connectionMap.get(p.connectionId || '');
    return {
      id: p.id,
      subscriberName: p.subscriberName || conn?.name || '',
      subscriberId: p.subscriberId || '',
      internetId: conn?.internetId || '',
      connectionId: p.connectionId || p.subscriberId || '',
      billId: Number(p.billNo) || 0,
      amount: Number(p.amount) || 0,
      packageAmount: Number(conn?.sameAmount) || 0,
      packageName: connectionPackageName(conn),
      collectionDate: p.paymentDate || p.createdAt || '',
      systemDate: p.createdAt || '',
      address: p.address || conn?.address || '',
      sublocality: p.areaName || '',
      connectionType: conn?.connectionType || p.subscriber?.connectionType || 'internet',
      collectedBy: p.collectedByName || '',
      method: p.method || 'cash',
      transactionType: p.transactionType || p.method || 'Other',
      transactionId: p.transactionId || '',
      transactionIds: [],
      discount: conn?.discount || '',
      internetDiscount: conn?.sameDiscount || '',
    };
  }), [payments, connectionMap]);

  const packageCounts = useMemo(() => {
    const base = (connections as Connection[]).filter((c) => connectionType === 'both' || c.connectionType === connectionType);
    return packageSubscriberCounts(base);
  }, [connections, connectionType]);

  const filteredData = useMemo(() => {
    if (!showReport) return [];

    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);

    const base = data.filter((item) => {
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const userMatch = selectedUser === 'all' || item.collectedBy === selectedUser;
      return connectionMatch && sublocalityMatch && userMatch;
    });

    const items = base.filter((item) => {
      const conn = connectionMap.get(item.connectionId);
      const itemDate = new Date(item.collectionDate);
      switch (reportType) {
        case 'all':
        case 'collected2':
        case 'sublocality-wise':
        case 'transaction-wise':
          return inDateRange(itemDate, from, to);
        case 'collected':
          return inDateRange(itemDate, from, to) && !!conn && (Number(conn.remainingAmount) || 0) === 0;
        case 'balance':
          return inDateRange(itemDate, from, to) && !!conn && (Number(conn.remainingAmount) || 0) > 0;
        case 'system-dates':
          if (!conn) return false;
          return (
            inDateRange(parseDateOnly(conn.installationDate), from, to) ||
            inDateRange(parseDateOnly(conn.rechargeDate), from, to)
          );
        case 'discount':
          return inDateRange(itemDate, from, to) && !!conn && hasDiscount(conn);
        case 'internet-package-amount':
          return inDateRange(itemDate, from, to);
        case 'with-package':
          return inDateRange(itemDate, from, to) && !!conn && Boolean(conn.packageInternet || conn.packageCable);
        default:
          return inDateRange(itemDate, from, to);
      }
    });

    if (reportType === 'sublocality-wise') {
      const groups = new Map<string, { count: number; amount: number }>();
      items.forEach((item) => {
        const key = item.sublocality || 'Unknown';
        const g = groups.get(key) || { count: 0, amount: 0 };
        g.count += 1;
        g.amount += item.amount;
        groups.set(key, g);
      });
      return Array.from(groups.entries())
        .map(([key, g]): CollectionRecord => ({
          id: `sublocality-${key}`,
          subscriberName: key,
          subscriberId: '',
          internetId: '',
          connectionId: '',
          billId: g.count,
          amount: g.amount,
          packageAmount: 0,
          packageName: '',
          collectionDate: '',
          systemDate: '',
          address: '',
          sublocality: key,
          connectionType: '',
          collectedBy: '',
          method: '',
          transactionType: '',
          transactionId: '',
          transactionIds: [],
          discount: '',
          internetDiscount: '',
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    if (reportType === 'package-wise') {
      const groups = new Map<string, number>();
      items.forEach((item) => {
        const key = item.packageName || 'No Package';
        groups.set(key, (groups.get(key) || 0) + item.amount);
      });
      const names = new Set<string>([...packageCounts.keys(), ...groups.keys()]);
      return Array.from(names)
        .map((key): CollectionRecord => ({
          id: `package-${key}`,
          subscriberName: key,
          subscriberId: '',
          internetId: '',
          connectionId: '',
          billId: packageCounts.get(key) || 0,
          amount: groups.get(key) || 0,
          packageAmount: 0,
          packageName: key,
          collectionDate: '',
          systemDate: '',
          address: '',
          sublocality: '',
          connectionType: '',
          collectedBy: '',
          method: '',
          transactionType: '',
          transactionId: '',
          transactionIds: [],
          discount: '',
          internetDiscount: '',
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    if (reportType === 'transaction-wise') {
      const groups = new Map<string, { subscribers: Set<string>; amount: number; transactionIds: Set<string> }>();
      items.forEach((item) => {
        const key = item.transactionType || item.method || 'Other';
        const g = groups.get(key) || { subscribers: new Set<string>(), amount: 0, transactionIds: new Set<string>() };
        g.subscribers.add(item.subscriberId);
        g.amount += item.amount;
        if (item.transactionId) g.transactionIds.add(item.transactionId);
        groups.set(key, g);
      });
      return Array.from(groups.entries())
        .map(([key, g]): CollectionRecord => ({
          id: `transaction-${key}`,
          subscriberName: key,
          subscriberId: '',
          internetId: '',
          connectionId: '',
          billId: g.subscribers.size,
          amount: g.amount,
          packageAmount: 0,
          packageName: '',
          collectionDate: '',
          systemDate: '',
          address: '',
          sublocality: '',
          connectionType: '',
          collectedBy: '',
          method: key,
          transactionType: key,
          transactionId: '',
          transactionIds: Array.from(g.transactionIds),
          discount: '',
          internetDiscount: '',
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    return items;
  }, [data, connectionMap, filterFromDate, filterToDate, reportType, connectionType, sublocality, selectedUser, showReport]);

  const isGroupedReport = reportType === 'sublocality-wise' || reportType === 'package-wise' || reportType === 'transaction-wise';

  const packageWiseData = useMemo(() => buildPackageWiseReport(packageCounts, filteredData), [packageCounts, filteredData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterFromDate, filterToDate, reportType, connectionType, sublocality, selectedUser, pageSize, showAll]);

  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize, showAll]);

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalRecords = filteredData.length;

  const handleDelete = async (item: CollectionRecord) => {
    if (!confirm(`Delete the collection entry for "${item.subscriberName}" (Bill #${item.billId || '-'})? This cannot be undone.`)) return;
    try {
      await api.delete(`/billing/payments/${item.id}`);
      toast({ title: 'Deleted', description: 'Collection entry deleted successfully.' });
      refetchPayments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to delete entry',
      });
    }
  };

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    let headers: string[];
    let rows: (string | number)[][];

    if (reportType === 'transaction-wise') {
      headers = ['#', 'Transaction Type', 'Transaction ID', 'Subscribers', 'Total Amount'];
      rows = filteredData.map((item, i) => [
        i + 1,
        item.transactionType,
        item.transactionIds.length ? item.transactionIds.join(', ') : '-',
        item.billId,
        item.amount.toFixed(2),
      ]);
    } else if (reportType === 'system-dates') {
      const excel = systemDatesExcel(filteredData.map(toSystemDateRow));
      headers = excel.headers;
      rows = excel.rows;
    } else if (reportType === 'internet-package-amount') {
      const excel = internetPackageExcel(filteredData.map(toInternetPackageRow));
      headers = excel.headers;
      rows = excel.rows;
    } else if (reportType === 'package-wise') {
      const excel = packageWiseExcel(filteredData.map(toPackageWiseRow));
      headers = excel.headers;
      rows = excel.rows;
    } else if (reportType === 'with-package') {
      const excel = withPackageExcel(packageWiseData);
      headers = excel.headers;
      rows = excel.rows;
    } else {
      headers = ['Subscriber Name', 'Bill ID', 'Amount', 'Collection Date', 'Address', 'Connection Type', 'Discount', 'Received By', 'Collected By'];
      rows = filteredData.map((item) => [
        item.subscriberName,
        item.billId || '',
        item.amount.toFixed(2),
        item.collectionDate,
        item.address,
        item.connectionType,
        formatConnectionDiscount(item),
        item.method,
        item.collectedBy,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `subscriber-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-blue-600', border: 'border-blue-600', headerBg: 'bg-blue-600', rowHover: 'hover:bg-blue-50/50' };

    if (reportType === 'system-dates') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<SystemDateRow>
            title="SUBSCRIBER REPORT"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={filteredData.map(toSystemDateRow)}
            columns={systemDatesInvoiceColumns()}
            emptyMessage="No collection records found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    if (reportType === 'internet-package-amount') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<InternetPackageRow>
            title="SUBSCRIBER REPORT"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={filteredData.map(toInternetPackageRow)}
            columns={internetPackageInvoiceColumns()}
            emptyMessage="No collection records found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    if (reportType === 'package-wise') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<PackageWiseRow>
            title="SUBSCRIBER REPORT"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={filteredData.map(toPackageWiseRow)}
            columns={packageWiseInvoiceColumns()}
            emptyMessage="No collection records found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    if (reportType === 'with-package') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<PackageWiseRow>
            title="SUBSCRIBER REPORT"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={packageWiseData}
            columns={withPackageInvoiceColumns()}
            emptyMessage="No collection records found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    const columns: InvoiceColumn<CollectionRecord>[] = reportType === 'transaction-wise'
      ? [
          { header: '#', render: (_: CollectionRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
          { header: 'Transaction Type', render: (r) => <span className="font-semibold capitalize">{r.transactionType}</span> },
          { header: 'Transaction ID', render: (r) => (r.transactionIds.length ? r.transactionIds.join(', ') : '-') },
          { header: 'Subscribers', render: (r) => r.billId },
          { header: 'Total Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
        ]
      : [
          { header: '#', render: (_: CollectionRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
          { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
          { header: 'Bill ID', render: (r) => (r.billId > 0 ? r.billId : '-') },
          { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
          { header: 'Collection Date', render: (r) => (r.collectionDate ? format(new Date(r.collectionDate), 'dd MMM yyyy') : '-') },
          { header: 'Address', render: (r) => r.address || '-' },
          { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType}</span> },
          ...(reportType === 'discount'
            ? [{ header: 'Discount', render: (r: CollectionRecord) => <span className="capitalize">{formatConnectionDiscount(r)}</span> }]
            : []),
          { header: 'Collected By', render: (r) => r.collectedBy || '-' },
        ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<CollectionRecord>
          title="SUBSCRIBER REPORT"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No collection records found for the selected criteria."
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
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 shadow-sm">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriber Report</h1>
          <p className="text-sm text-muted-foreground">View and manage subscriber collections</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent no-print" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
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

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

            <div className="space-y-2">
              <Label>Collected By</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  {allUsers.map((user) => (
                    <SelectItem key={user} value={user}>{user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button
              onClick={() => {
                setShowReport(true);
                setCurrentPage(1);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Show Report
            </Button>
            {showReport && (
              <Button variant="outline" onClick={() => setShowReport(false)}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Section */}
      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Collection History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {format(filterFromDate, 'dd MMM yyyy')} — To: {format(filterToDate, 'dd MMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handlePrint} disabled={!showReport}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel} disabled={!showReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {!showReport ? (
              <div className="text-center py-8 text-muted-foreground">
                Select the filters above and press the Show Report button to generate the report.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No collection records found for the selected criteria.
              </div>
            ) : (
              <>
                <div className="min-w-0 overflow-x-auto">
                  {reportType === 'system-dates' ? (
                    <SubscriberSystemDatesTable rows={paginatedData.map(toSystemDateRow)} />
                  ) : reportType === 'internet-package-amount' ? (
                    <SubscriberInternetPackageTable rows={paginatedData.map(toInternetPackageRow)} />
                  ) : reportType === 'package-wise' ? (
                    <SubscriberPackageWiseTable rows={paginatedData.map(toPackageWiseRow)} />
                  ) : reportType === 'with-package' ? (
                    <SubscriberWithPackageTable rows={packageWiseData} />
                  ) : reportType === 'transaction-wise' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Transaction Type</TableHead>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Subscribers</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((item, i) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">{showAll ? i + 1 : (safePage - 1) * pageSize + i + 1}</TableCell>
                            <TableCell className="font-medium capitalize">{item.transactionType}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={item.transactionIds.join(', ')}>{item.transactionIds.length ? item.transactionIds.join(', ') : '-'}</TableCell>
                            <TableCell>{item.billId}</TableCell>
                            <TableCell className="text-right font-medium">PKR {item.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Subscriber Name</TableHead>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Collection Date</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Connection Type</TableHead>
                        {reportType === 'discount' && <TableHead>Discount</TableHead>}
                        <TableHead>Received By</TableHead>
                        <TableHead>Collected By</TableHead>
                        {!isGroupedReport && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item, i) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{showAll ? i + 1 : (safePage - 1) * pageSize + i + 1}</TableCell>
                          <TableCell className="font-medium">
                            {item.connectionId ? (
                              <Link
                                href={`/crm/subscriber-detail?connectionId=${item.connectionId}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {item.subscriberName}
                              </Link>
                            ) : (
                              <span className="font-medium">{item.subscriberName}</span>
                            )}
                          </TableCell>
                          <TableCell>{item.billId > 0 ? item.billId : '-'}</TableCell>
                          <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                          <TableCell>{item.collectionDate ? format(new Date(item.collectionDate), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={item.address}>{item.address || '---'}</TableCell>
                          <TableCell>{item.connectionType}</TableCell>
                          {reportType === 'discount' && <TableCell>{formatConnectionDiscount(item)}</TableCell>}
                          <TableCell className="capitalize">{item.method}</TableCell>
                          <TableCell>{item.collectedBy || '---'}</TableCell>
                          {!isGroupedReport && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(item)}
                                title="Delete entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 no-print">
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedData.length === 0 ? 0 : (showAll ? 1 : (safePage - 1) * pageSize + 1)} to {Math.min(safePage * pageSize, filteredData.length)} of {filteredData.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Show</Label>
                      <Select
                        value={showAll ? 'all' : String(pageSize)}
                        onValueChange={(value) => {
                          if (value === 'all') {
                            setShowAll(true);
                          } else {
                            setShowAll(false);
                            setPageSize(parseInt(value));
                          }
                        }}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent portal={false}>
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                          ))}
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label className="text-sm text-muted-foreground">entries</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={safePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-2 text-sm text-muted-foreground">
                        Page {safePage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={safePage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
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
