'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Printer, Wallet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import SubscriberSystemDatesTable, { systemDatesExcel, systemDatesInvoiceColumns, type SystemDateRow } from '@/components/shared/subscriber-system-dates';
import SubscriberInternetPackageTable, { internetPackageExcel, internetPackageInvoiceColumns, type InternetPackageRow } from '@/components/shared/subscriber-internet-package';
import SubscriberPackageWiseTable, { packageWiseExcel, packageWiseInvoiceColumns, withPackageExcel, withPackageInvoiceColumns, SubscriberWithPackageTable, buildPackageWiseReport, packageSubscriberCounts, connectionPackageName, type PackageWiseRow } from '@/components/shared/subscriber-package-wise';
import { SUBSCRIBER_REPORT_TYPE_OPTIONS, matchesReportType, type ReportTypeConn } from '@/lib/subscriber-report-types';
import type { Invoice, Connection, Area } from '@/lib/types';

interface UnpaidRecord {
  id: string;
  subscriberId: string;
  subscriberName: string;
  internetId: string;
  address: string;
  amount: number;
  packageAmount: number;
  packageName: string;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  billingPeriod: string;
  sublocality: string;
  connectionType: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

function toSystemDateRow(item: UnpaidRecord): SystemDateRow {
  return {
    id: item.id,
    connectionId: item.subscriberId || undefined,
    internetId: item.internetId || undefined,
    name: item.subscriberName,
    address: item.address,
    amount: item.amount,
  };
}

function toInternetPackageRow(item: UnpaidRecord): InternetPackageRow {
  return {
    id: item.id,
    connectionId: item.subscriberId || undefined,
    internetId: item.internetId || undefined,
    name: item.subscriberName,
    address: item.address,
    amount: item.amount,
    packageAmount: item.packageAmount,
  };
}

export default function UnpaidCollectionsPage() {
  const { companyId } = useCompany();

  const { data: invoices = [], isLoading: loading } = useGenericQuery<Invoice>('billing/invoices', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);

  const areas = areasData as Area[];

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => new Date(new Date().getFullYear() - 1, 0, 1));
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(() => new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [sublocality, setSublocality] = useState('all');
  const [reportType, setReportType] = useState('all');

  const [showReport, setShowReport] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showAll, setShowAll] = useState(false);

  const connMap = useMemo(() => {
    const map: Record<string, ReportTypeConn & { sublocality: string; connectionType: string; internetId: string; address: string }> = {};
    connections.forEach(c => {
      const area = areas.find(a => a.id === (c.sublocalityId || ''));
      const sub = area ? (area.subLocality || area.locality || c.sublocalityId || '') : '';
      map[c.id] = {
        sublocality: sub,
        connectionType: c.connectionType || '',
        internetId: c.internetId || '',
        address: c.address || '',
        remainingAmount: c.remainingAmount ?? c.amount,
        installationDate: c.installationDate,
        rechargeDate: c.rechargeDate,
        discount: c.discount,
        sameDiscount: c.sameDiscount,
        sameAmount: c.sameAmount,
        packageInternet: c.packageInternet,
        packageCable: c.packageCable,
      };
    });
    return map;
  }, [connections, areas]);

  const unpaidRecords: UnpaidRecord[] = useMemo(() => {
    const map = new Map<string, UnpaidRecord>();
    invoices.forEach(inv => {
      if (inv.status === 'paid' || Number(inv.remainingAmount) <= 0) return;
      const conn = connMap[inv.subscriberId] || {};
      const amount = Number(inv.amount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      const remaining = Number(inv.remainingAmount) || 0;
      const period = inv.billingPeriod || '';
      const due = inv.dueDate || '';
      const existing = map.get(inv.subscriberId);
      if (existing) {
        existing.amount += amount;
        existing.paidAmount += paid;
        existing.remainingAmount += remaining;
        if (period && !existing.billingPeriod.includes(period)) {
          existing.billingPeriod = existing.billingPeriod ? `${existing.billingPeriod}, ${period}` : period;
        }
        if (!existing.dueDate || (due && new Date(due) < new Date(existing.dueDate))) existing.dueDate = due;
      } else {
        map.set(inv.subscriberId, {
          id: inv.subscriberId,
          subscriberId: inv.subscriberId,
          subscriberName: inv.subscriberName || '',
          internetId: conn.internetId || '',
          address: conn.address || '',
          amount,
          packageAmount: Number(conn.sameAmount) || 0,
          packageName: connectionPackageName(conn),
          paidAmount: paid,
          remainingAmount: remaining,
          dueDate: due,
          billingPeriod: period,
          sublocality: conn.sublocality || '',
          connectionType: conn.connectionType || '',
        });
      }
    });
    return Array.from(map.values());
  }, [invoices, connMap]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    unpaidRecords.forEach(r => { if (r.sublocality) set.add(r.sublocality); });
    return Array.from(set).sort();
  }, [unpaidRecords]);

  const filteredData = useMemo(() => {
    if (!showReport) return [];

    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);

    return unpaidRecords.filter((item) => {
      const itemDate = new Date(item.dueDate);
      if (isNaN(itemDate.getTime())) return false;

      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
      const typeMatch = matchesReportType({ reportType, itemDate, conn: connMap[item.subscriberId], from, to });

      return typeMatch && sublocalityMatch;
    });
  }, [unpaidRecords, filterFromDate, filterToDate, sublocality, reportType, showReport, connMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterFromDate, filterToDate, sublocality, reportType, pageSize, showAll]);

  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize, showAll]);

  const totalRecords = showReport ? filteredData.length : unpaidRecords.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.remainingAmount, 0);

  const packageCounts = useMemo(() => packageSubscriberCounts(connections as Connection[]), [connections]);

  const packageWiseData = useMemo(() => buildPackageWiseReport(packageCounts, filteredData), [packageCounts, filteredData]);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    if (reportType === 'system-dates') {
      const excel = systemDatesExcel(filteredData.map(toSystemDateRow));
      const csvContent = [excel.headers.join(','), ...excel.rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unpaid-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (reportType === 'internet-package-amount') {
      const excel = internetPackageExcel(filteredData.map(toInternetPackageRow));
      const csvContent = [excel.headers.join(','), ...excel.rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unpaid-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (reportType === 'package-wise') {
      const excel = packageWiseExcel(packageWiseData);
      const csvContent = [excel.headers.join(','), ...excel.rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unpaid-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (reportType === 'with-package') {
      const excel = withPackageExcel(packageWiseData);
      const csvContent = [excel.headers.join(','), ...excel.rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unpaid-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const headers = ['Subscriber Name', 'Billing Period', 'Amount', 'Paid Amount', 'Remaining Amount', 'Due Date', 'Sublocality', 'Connection Type'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.billingPeriod,
      item.amount.toFixed(2),
      item.paidAmount.toFixed(2),
      item.remainingAmount.toFixed(2),
      item.dueDate,
      item.sublocality,
      item.connectionType,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `unpaid-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-amber-600', border: 'border-amber-600', headerBg: 'bg-amber-600', rowHover: 'hover:bg-amber-50/50' };

    if (reportType === 'system-dates') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<SystemDateRow>
            title="UNPAID COLLECTIONS"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={filteredData.map(toSystemDateRow)}
            columns={systemDatesInvoiceColumns()}
            emptyMessage="No unpaid collections found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    if (reportType === 'internet-package-amount') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<InternetPackageRow>
            title="UNPAID COLLECTIONS"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={filteredData.map(toInternetPackageRow)}
            columns={internetPackageInvoiceColumns()}
            emptyMessage="No unpaid collections found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    if (reportType === 'package-wise') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<PackageWiseRow>
            title="UNPAID COLLECTIONS"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={packageWiseData}
            columns={packageWiseInvoiceColumns()}
            emptyMessage="No unpaid collections found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    if (reportType === 'with-package') {
      return (
        <div className="p-6">
          <SubscriberReportInvoice<PackageWiseRow>
            title="UNPAID COLLECTIONS"
            subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
            accent={accent}
            data={packageWiseData}
            columns={withPackageInvoiceColumns()}
            emptyMessage="No unpaid collections found for the selected criteria."
            onBack={() => setShowInvoice(false)}
          />
        </div>
      );
    }

    const columns: InvoiceColumn<UnpaidRecord>[] = [
      { header: '#', render: (_: UnpaidRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
      { header: 'Billing Period', render: (r) => r.billingPeriod || '-' },
      { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
      { header: 'Paid (PKR)', align: 'right', render: (r) => r.paidAmount.toLocaleString() },
      { header: 'Remaining (PKR)', align: 'right', render: (r) => <span className="font-semibold">{r.remainingAmount.toLocaleString()}</span> },
      { header: 'Due Date', render: (r) => (r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : '-') },
      { header: 'Sublocality', render: (r) => r.sublocality || '-' },
      { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType || '-'}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<UnpaidRecord>
          title="UNPAID COLLECTIONS"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No unpaid collections found for the selected criteria."
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
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 shadow-sm">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unpaid Collections</h1>
          <p className="text-sm text-muted-foreground">Subscribers with pending collection amounts</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent no-print" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Unpaid Amount</p>
              <p className="text-2xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button
              onClick={() => {
                setShowReport(true);
                setCurrentPage(1);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
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
                <h2 className="text-xl font-bold">Unpaid Collection History</h2>
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
                No unpaid collections found for the selected criteria.
              </div>
            ) : (
              <>
                <div className="min-w-0 overflow-x-auto">
                  {reportType === 'system-dates' ? (
                    <SubscriberSystemDatesTable rows={paginatedData.map(toSystemDateRow)} />
                  ) : reportType === 'internet-package-amount' ? (
                    <SubscriberInternetPackageTable rows={paginatedData.map(toInternetPackageRow)} />
                  ) : reportType === 'package-wise' ? (
                    <SubscriberPackageWiseTable rows={packageWiseData} />
                  ) : reportType === 'with-package' ? (
                    <SubscriberWithPackageTable rows={packageWiseData} />
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Subscriber Name</TableHead>
                        <TableHead>Billing Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Sublocality</TableHead>
                        <TableHead>Connection Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item, i) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{showAll ? i + 1 : (safePage - 1) * pageSize + i + 1}</TableCell>
                          <TableCell className="font-medium">
                            {item.subscriberId ? (
                              <Link
                                href={`/crm/subscriber-detail?connectionId=${item.subscriberId}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {item.subscriberName}
                              </Link>
                            ) : (
                              item.subscriberName
                            )}
                          </TableCell>
                          <TableCell>{item.billingPeriod || '-'}</TableCell>
                          <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                          <TableCell>PKR {item.paidAmount.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-destructive">PKR {item.remainingAmount.toLocaleString()}</TableCell>
                          <TableCell>{item.dueDate ? format(new Date(item.dueDate), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell>{item.sublocality || '---'}</TableCell>
                          <TableCell className="capitalize">{item.connectionType || '---'}</TableCell>
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
