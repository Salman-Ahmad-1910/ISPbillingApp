'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, Handshake, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { SubscriberReportInvoice, type InvoiceColumn } from '@/components/shared/subscriber-report-print';
import type { Payment, Connection, Area, User } from '@/lib/types';

interface AllocatedCollectionRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  connectionId: string;
  billId: string;
  amount: number;
  collectionDate: string;
  address: string;
  sublocality: string;
  connectionType: string;
  collectedBy: string;
  method: string;
  officerId: string;
  officerName: string;
}

function resolveAreaName(area: Area): string {
  return [area.city, area.zone, area.locality].filter(Boolean).join(', ');
}

export default function AllocatedCollectionsPage() {
  const { companyId } = useCompany();

  const { data: payments = [], isLoading: loading } = useGenericQuery<Payment>('billing/payments', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: areasData = [] } = useGenericQuery<Area>('network/areas', companyId ?? undefined);
  const { data: users = [] } = useGenericQuery<User>('admin/users', companyId ?? undefined);

  const areas = areasData as Area[];

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [selectedOfficer, setSelectedOfficer] = useState('all');
  const [sublocality, setSublocality] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [showInvoice, setShowInvoice] = useState(false);

  const officers = useMemo(() => {
    const list = (users as User[])
      .filter((u: User) => u.role === 'staff' || u.role === 'recovery_officer')
      .map((u: User) => ({ id: u.id, name: u.name }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [users]);

  const officerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (users as User[]).forEach((u: User) => { if (u.id) map[u.id] = u.name; });
    return map;
  }, [users]);

  const areaMap = useMemo(() => {
    const map: Record<string, { name: string; recoveryOfficerId: string }> = {};
    areas.forEach((a: Area) => {
      map[a.id] = { name: resolveAreaName(a), recoveryOfficerId: a.recoveryOfficerId || '' };
    });
    return map;
  }, [areas]);

  const connMap = useMemo(() => {
    const map: Record<string, { internetId: string; connectionType: string; address: string; sublocalityId: string }> = {};
    (connections as Connection[]).forEach((c: Connection) => {
      map[c.id] = {
        internetId: c.internetId || '',
        connectionType: c.connectionType || '',
        address: c.address || '',
        sublocalityId: c.sublocalityId || '',
      };
    });
    return map;
  }, [connections]);

  const allRecords: AllocatedCollectionRecord[] = useMemo(() => {
    const records: AllocatedCollectionRecord[] = [];
    (payments as Payment[]).forEach((p) => {
      const conn = connMap[p.subscriberId || ''] || {};
      const area = areaMap[conn.sublocalityId] || null;
      if (!area || !area.recoveryOfficerId) return;

      records.push({
        id: p.id,
        subscriberName: p.subscriberName || '',
        subscriberId: conn.internetId || '',
        connectionId: p.subscriberId || '',
        billId: String(p.billNo || '') || p.id.slice(0, 8) || '',
        amount: Number(p.amount) || 0,
        collectionDate: p.paymentDate || '',
        address: p.address || conn.address || '',
        sublocality: p.areaName || area.name || '',
        connectionType: conn.connectionType || 'internet',
        collectedBy: p.collectedByName || '',
        method: p.method || 'cash',
        officerId: area.recoveryOfficerId,
        officerName: officerNameMap[area.recoveryOfficerId] || '',
      });
    });
    return records;
  }, [payments, connMap, areaMap, officerNameMap]);

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => { if (r.sublocality) set.add(r.sublocality); });
    return Array.from(set);
  }, [allRecords]);

  const filteredData = useMemo(() => allRecords.filter((item) => {
    const officerMatch = selectedOfficer === 'all' || item.officerId === selectedOfficer;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;

    const itemDate = new Date(item.collectionDate);
    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);
    const dateMatch = !isNaN(itemDate.getTime()) && itemDate >= from && itemDate <= to;

    return officerMatch && sublocalityMatch && connectionMatch && dateMatch;
  }), [allRecords, selectedOfficer, sublocality, connectionType, filterFromDate, filterToDate]);

  const totalRecords = filteredData.length;
  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'Bill ID', 'Amount', 'Collection Date', 'Address', 'Sublocality', 'Connection Type', 'Allocated Officer', 'Transaction Type'];
    const rows = filteredData.map((item) => [
      item.subscriberName, item.subscriberId, item.billId, item.amount.toFixed(2), item.collectionDate,
      item.address, item.sublocality, item.connectionType, item.officerName, item.method,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `allocated-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowInvoice(true);
  };

  if (showInvoice) {
    const accent = { title: 'text-violet-600', border: 'border-violet-600', headerBg: 'bg-violet-600', rowHover: 'hover:bg-violet-50/50' };
    const columns: InvoiceColumn<AllocatedCollectionRecord>[] = [
      { header: '#', render: (_: AllocatedCollectionRecord, i: number) => <span className="font-mono text-xs text-gray-500">{i + 1}</span> },
      { header: 'Subscriber Name', render: (r) => <span className="font-semibold">{r.subscriberName}</span> },
      { header: 'Subscriber ID', render: (r) => r.subscriberId.slice(0, 8) || '-' },
      { header: 'Bill ID', render: (r) => r.billId || '-' },
      { header: 'Amount (PKR)', align: 'right', render: (r) => r.amount.toLocaleString() },
      { header: 'Collection Date', render: (r) => (r.collectionDate ? format(new Date(r.collectionDate), 'dd MMM yyyy') : '-') },
      { header: 'Address', render: (r) => r.address || '-' },
      { header: 'Sublocality', render: (r) => r.sublocality || '-' },
      { header: 'Connection Type', render: (r) => <span className="capitalize">{r.connectionType}</span> },
      { header: 'Allocated Officer', render: (r) => r.officerName || '-' },
      { header: 'Transaction Type', render: (r) => <span className="capitalize">{r.method}</span> },
    ];

    return (
      <div className="p-6">
        <SubscriberReportInvoice<AllocatedCollectionRecord>
          title="ALLOCATED COLLECTIONS REPORT"
          subtitle={`From: ${format(filterFromDate, 'dd MMM yyyy')} — To: ${format(filterToDate, 'dd MMM yyyy')}`}
          accent={accent}
          data={filteredData}
          columns={columns}
          emptyMessage="No allocated collections found for the selected criteria."
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

      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 shadow-sm">
          <Handshake className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Allocated Collections</h1>
          <p className="text-sm text-muted-foreground">Collections made in areas assigned to a staff member or recovery officer</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent no-print" />

      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collections</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Handshake className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Handshake className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Staff / Recovery Officer</Label>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Allocated Areas</SelectItem>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            <Button onClick={handlePrint} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Allocated Collections List</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedOfficer !== 'all'
                    ? `Officer: ${officers.find((o) => o.id === selectedOfficer)?.name || '-'}`
                    : 'Officer: All Allocated Areas'}
                  {' — '}
                  From: {format(filterFromDate, 'dd MMM yyyy')} — To: {format(filterToDate, 'dd MMM yyyy')}
                </p>
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

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No allocated collections found for the selected criteria.
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Subscriber Name</TableHead>
                      <TableHead>Subscriber ID</TableHead>
                      <TableHead>Bill ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Collection Date</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Sublocality</TableHead>
                      <TableHead>Connection Type</TableHead>
                      <TableHead>Allocated Officer</TableHead>
                      <TableHead>Transaction Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/subscriber-detail?connectionId=${item.connectionId}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.subscriberName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.subscriberId.slice(0, 8) || '---'}</TableCell>
                        <TableCell>{item.billId || '---'}</TableCell>
                        <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">PKR {item.amount.toLocaleString()}</TableCell>
                        <TableCell>{item.collectionDate ? format(new Date(item.collectionDate), 'dd MMM yyyy') : '---'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.address || '---'}</TableCell>
                        <TableCell>{item.sublocality || '---'}</TableCell>
                        <TableCell className="capitalize">{item.connectionType || '---'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.officerName || '---'}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{item.method}</TableCell>
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
