'use client';

import { useState, useRef, useMemo } from 'react';
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
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: allSubscribers = [], isLoading: loading } = useGenericQuery<any>('subscribers', companyId ?? undefined);

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

  // History date range
  const [historyFromDate, setHistoryFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [historyFromDateOpen, setHistoryFromDateOpen] = useState(false);
  const [historyToDate, setHistoryToDate] = useState<Date>(new Date());
  const [historyToDateOpen, setHistoryToDateOpen] = useState(false);

  // Extract unique sublocalities from data
  const sublocalities = useMemo(() => {
    const set = new Set<string>();
    allSubscribers.forEach((s: any) => {
      if (s.areaName) set.add(s.areaName);
    });
    return Array.from(set);
  }, [allSubscribers]);

  // Filter deactivated subscribers
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

  const filteredData = deactivatedData.filter((item) => {
    const itemDate = new Date(item.deactivationDate);
    const from = new Date(historyFromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(historyToDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = itemDate >= from;
    const beforeTo = itemDate <= to;
    const sublocalityMatch = sublocality === 'all' || item.sublocality === sublocality;
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
    const typeMatch = reportType === 'all' || item.reason === reportType;

    return afterFrom && beforeTo && sublocalityMatch && connectionMatch && typeMatch;
  });

  const totalRecords = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Subscriber Name', 'Subscriber ID', 'CNIC', 'Phone', 'Address', 'Sublocality', 'Connection Type', 'Package', 'Deactivation Date', 'Reason', 'Deactivated By'];
    const rows = filteredData.map((item) => [
      item.subscriberName,
      item.subscriberId,
      item.cnic,
      item.phone,
      item.address,
      item.sublocality,
      item.connectionType,
      item.packageName,
      item.deactivationDate,
      item.reason,
      item.deactivatedBy,
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
        <div className="rounded-lg bg-primary/10 p-2.5">
          <UserX className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deactivate User Reports</h1>
          <p className="text-sm text-muted-foreground">View deactivated user accounts and their details</p>
        </div>
      </div>

      {/* Filter Row */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            {/* Sublocality */}
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

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="voluntary">Voluntary</SelectItem>
                  <SelectItem value="non-payment">Non-Payment</SelectItem>
                  <SelectItem value="system">System</SelectItem>
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

      {/* Deactivation History */}
      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Deactivation History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All deactivated user records
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
            <div className="flex items-center mb-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Deactivated</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
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
                      <TableCell className="font-medium">{item.subscriberName}</TableCell>
                      <TableCell>{item.subscriberId}</TableCell>
                      <TableCell>{item.cnic}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.address}</TableCell>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
