'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Printer, FileX2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import type { Connection, Area } from '@/lib/types';

interface NotGeneratedRecord {
  id: string;
  internetId: string;
  name: string;
  address: string;
  sublocality: string;
  connectionType: string;
  amount: number;
  rechargeDate: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

const MONTHS = [
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthYear(dateStr?: string): { month: string; year: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { month: MONTH_NAMES[d.getMonth()], year: String(d.getFullYear()) };
}

export default function NotGeneratedCollectionsPage() {
  const { companyId } = useCompany();

  const { data: connections = [], isLoading: loading } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: bills = [] } = useGenericQuery<any>('billing/bills', companyId ?? undefined);

  const areas = areasData as Area[];

  const [filterMonth, setFilterMonth] = useState(() => MONTH_NAMES[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));
  const [reportType, setReportType] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');

  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(() => new Date(new Date().getFullYear(), 11, 31));
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showAll, setShowAll] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(String(new Date().getFullYear()));
    connections.forEach(c => {
      const my = getMonthYear(c.rechargeDate || c.installationDate);
      if (my) years.add(my.year);
    });
    return Array.from(years).sort().reverse();
  }, [connections]);

  const areaName = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    return area ? (area.subLocality || area.locality || areaId.slice(0, 8)) : areaId;
  };

  const generatedIds = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    const zeroUuid = '00000000-0000-0000-0000-000000000000';
    bills.forEach((b: any) => {
      if (b.month !== filterMonth || String(b.year) !== filterYear) return;
      if (b.status && b.status !== 'Created') return;
      if (b.connectionId && b.connectionId !== zeroUuid) ids.add(b.connectionId);
      if (b.subscriberIds) {
        try {
          JSON.parse(b.subscriberIds).forEach((id: string) => ids.add(id));
        } catch {
          /* ignore */
        }
      }
      if (b.connectionName) {
        b.connectionName.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((name: string) => names.add(name));
      }
    });
    return { ids, names };
  }, [bills, filterMonth, filterYear]);

  const allRecords: NotGeneratedRecord[] = useMemo(() => {
    const result: NotGeneratedRecord[] = [];
    connections.forEach(c => {
      if (c.status === 'deactivated') return;
      if (generatedIds.ids.has(c.id)) return;
      if (generatedIds.names.has(c.name)) return;

      let amount = 0;
      if (c.connectionType === 'tv_cable') amount = c.amount || 0;
      else if (c.connectionType === 'internet') amount = c.sameAmount || 0;
      else amount = (c.amount || 0) + (c.sameAmount || 0);

      result.push({
        id: c.id,
        internetId: c.internetId || '',
        name: c.name,
        address: c.address || '',
        sublocality: areaName(c.sublocalityId || ''),
        connectionType: c.connectionType,
        amount,
        rechargeDate: c.rechargeDate || c.installationDate || '',
      });
    });
    return result;
  }, [connections, generatedIds, areas]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => { if (r.sublocality) set.add(r.sublocality); });
    return Array.from(set).sort();
  }, [allRecords]);

  const filteredData = useMemo(() => {
    if (!showReport) return [];

    return allRecords.filter((item) => {
      const typeMatch = reportType === 'all' || item.connectionType === reportType;
      const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
      const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;

      const parsed = new Date(item.rechargeDate);
      if (isNaN(parsed.getTime())) return false;
      const from = new Date(historyFromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(historyToDate);
      to.setHours(23, 59, 59, 999);
      const dateMatch = parsed >= from && parsed <= to;

      return typeMatch && connectionMatch && sublocalityMatch && dateMatch;
    });
  }, [allRecords, reportType, sublocality, connectionType, historyFromDate, historyToDate, showReport]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterYear, reportType, sublocality, connectionType, historyFromDate, historyToDate, pageSize, showAll]);

  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize, showAll]);

  const totalRecords = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Internet ID', 'Address', 'Sublocality', 'Connection Type', 'Amount', 'Recharge Date'];
    const rows = filteredData.map((item) => [
      item.name,
      item.internetId,
      item.address,
      item.sublocality,
      item.connectionType,
      item.amount.toFixed(2),
      item.rechargeDate,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `not-generated-collections-${filterMonth}-${filterYear}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-rose-600', border: 'border-rose-600', headerBg: 'bg-rose-600', rowHover: 'hover:bg-rose-50/50' };
    const columns: InvoiceColumn<NotGeneratedRecord>[] = [
      { header: '#', render: (_: NotGeneratedRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.name}</span> },
      { header: 'Internet ID', render: (r) => r.internetId || '-' },
      { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
      { header: 'Address', render: (r) => r.address || '-' },
      { header: 'Sublocality', render: (r) => r.sublocality || '-' },
      { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType}</span> },
      { header: 'Recharge Date', render: (r) => (r.rechargeDate ? format(new Date(r.rechargeDate), 'dd MMM yyyy') : '-') },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<NotGeneratedRecord>
          title="NOT GENERATED COLLECTIONS"
          subtitle={`Month: ${filterMonth} ${filterYear} — From: ${format(historyFromDate, 'dd MMM yyyy')} — To: ${format(historyToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No not generated collections found for the selected criteria."
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
        <div className="rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 p-2.5 shadow-sm">
          <FileX2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Not Generated Collections</h1>
          <p className="text-sm text-muted-foreground">Subscribers whose collections were not generated for the selected month</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-orange-500/30 to-transparent no-print" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FileX2 className="h-5 w-5" />
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
              <FileX2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent portal={false}>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.label}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent portal={false}>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="tv_cable">TV Cable</SelectItem>
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
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button
              onClick={() => {
                setShowReport(true);
                setCurrentPage(1);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <FileX2 className="mr-2 h-4 w-4" />
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
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Not Generated Collection History</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Month: {filterMonth} {filterYear} — From: {format(historyFromDate, 'dd MMM yyyy')} — To: {format(historyToDate, 'dd MMM yyyy')}
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

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 no-print">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover open={historyFromDateOpen} onOpenChange={setHistoryFromDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !historyFromDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyFromDate ? format(historyFromDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={historyFromDate} onSelect={(date) => { if (date) { setHistoryFromDate(date); setHistoryFromDateOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover open={historyToDateOpen} onOpenChange={setHistoryToDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !historyToDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyToDate ? format(historyToDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={historyToDate} onSelect={(date) => { if (date) { setHistoryToDate(date); setHistoryToDateOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
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
                No not generated collections found for the selected criteria.
              </div>
            ) : (
              <>
                <div className="min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Subscriber Name</TableHead>
                        <TableHead>Internet ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Sublocality</TableHead>
                        <TableHead>Connection Type</TableHead>
                        <TableHead>Recharge Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item, i) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{showAll ? i + 1 : (safePage - 1) * pageSize + i + 1}</TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/crm/subscriber-detail?connectionId=${item.id}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {item.name}
                            </Link>
                          </TableCell>
                          <TableCell>{item.internetId || '-'}</TableCell>
                          <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={item.address}>{item.address || '---'}</TableCell>
                          <TableCell>{item.sublocality || '---'}</TableCell>
                          <TableCell className="capitalize">{item.connectionType}</TableCell>
                          <TableCell>{item.rechargeDate ? format(new Date(item.rechargeDate), 'dd MMM yyyy') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
