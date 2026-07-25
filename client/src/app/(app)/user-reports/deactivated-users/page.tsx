'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, UserX, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface DeactivatedRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  cnic: string;
  phone: string;
  address: string;
  sublocality: string;
  connectionType: string;
  packageName: string;
  deactivationDate: string;
  reason: string;
  deactivatedBy: string;
}

export default function DeactivatedUsersPage() {
  const { companyId } = useCompany();

  const { data: allSubscribers = [], isLoading: loading } = useGenericQuery<any>('subscribers', companyId ?? undefined);

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

  const allSublocalities = useMemo(() => {
    const set = new Set<string>();
    allSubscribers.forEach((s: any) => { if (s.areaName) set.add(s.areaName); });
    return Array.from(set);
  }, [allSubscribers]);

  const deactivatedData: DeactivatedRecord[] = useMemo(() => {
    return allSubscribers
      .filter((s: any) => s.status === 'deactivated' || s.status === 'inactive')
      .map((s: any) => ({
        id: s.id,
        subscriberName: s.name || '',
        subscriberId: s.subscriber_identity || '',
        cnic: s.cnic || '',
        phone: s.phone || '',
        address: s.installationAddress || '',
        sublocality: s.areaName || '',
        connectionType: s.connectionType || 'internet',
        packageName: s.packageName || '',
        deactivationDate: s.updatedAt || s.connectionDate || '',
        reason: s.deactivationReason || '',
        deactivatedBy: s.deactivatedBy || '',
      }));
  }, [allSubscribers]);

  const filteredData = useMemo(() => deactivatedData.filter((item) => {
    const itemDate = new Date(item.deactivationDate);
    const from = new Date(filterFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(filterToDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = itemDate >= from;
    const beforeTo = itemDate <= to;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
    const typeMatch = reportType === 'all' || item.reason === reportType;

    return afterFrom && beforeTo && sublocalityMatch && connectionMatch && typeMatch;
  }), [deactivatedData, filterFromDate, filterToDate, sublocality, connectionType, reportType]);

  const totalRecords = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'CNIC', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Package', 'Deactivation Date', 'Reason', 'Deactivated By'];
    const rows = filteredData.map((item) => [
      item.subscriberName, item.subscriberId, item.cnic, item.phone, item.address,
      item.sublocality, item.connectionType, item.packageName, item.deactivationDate, item.reason, item.deactivatedBy,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `deactivated-users-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-2.5 shadow-sm">
          <UserX className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deactivate User Reports</h1>
          <p className="text-sm text-muted-foreground">View deactivated user accounts and their details</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-red-500/50 via-rose-500/30 to-transparent no-print" />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-1 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Deactivated</p>
              <p className="text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-red-500 to-rose-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserX className="h-5 w-5" />
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
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="voluntary">Voluntary</SelectItem>
                  <SelectItem value="non-payment">Non-Payment</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Section */}
      <div className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Deactivation History</h2>
                <p className="text-sm text-muted-foreground mt-1">
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
                No deactivated user records found for the selected criteria.
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Subscriber Name</TableHead>
                      <TableHead>Subscriber ID</TableHead>
                      <TableHead>CNIC</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Sublocality</TableHead>
                      <TableHead>Connection Type</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Deactivation Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Deactivated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/subscriber-detail?connectionId=${item.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.subscriberName}
                          </Link>
                        </TableCell>
                        <TableCell>{item.subscriberId}</TableCell>
                        <TableCell>{item.cnic}</TableCell>
                        <TableCell>{item.phone}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.address || '---'}</TableCell>
                        <TableCell>{item.sublocality}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.connectionType}</Badge>
                        </TableCell>
                        <TableCell>{item.packageName}</TableCell>
                        <TableCell>{item.deactivationDate ? format(new Date(item.deactivationDate), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                        <TableCell>{item.deactivatedBy || '-'}</TableCell>
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
