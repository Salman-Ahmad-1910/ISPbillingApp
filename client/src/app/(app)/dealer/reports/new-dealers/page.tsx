'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer, UserPlus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface DealerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  cnic: string;
  walletBalance: number;
  createdAt: string;
  isActive: boolean;
}

interface AreaItem {
  id: string;
  name: string;
}

export default function NewDealersListPage() {
  const { companyId, companies } = useCompany();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState<DealerRecord[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [dealersRes, collectionsRes, areasRes] = await Promise.all([
        api.get('/dealers', { params: { companyId } }),
        api.get('/dealers/collections', { params: { companyId } }),
        api.get('/network/areas', { params: { companyId } }),
      ]);

      const allDealers: any[] = dealersRes.data?.data || [];
      const collections: any[] = collectionsRes.data?.data || [];

      const dealerIdsWithCollections = new Set(collections.map((c: any) => c.dealerId));

      setDealers(
        allDealers.map((d: any) => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          email: d.email,
          cnic: d.cnic,
          walletBalance: d.walletBalance || 0,
          createdAt: d.createdAt,
          isActive: dealerIdsWithCollections.has(d.id),
        })),
      );

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

  const filteredData = dealers.filter((dealer) => {
    const created = new Date(dealer.createdAt);
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const afterFrom = created >= from;
    const beforeTo = created <= to;
    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'active' && dealer.isActive) ||
      (statusFilter === 'non-active' && !dealer.isActive);

    return afterFrom && beforeTo && statusMatch;
  });

  const totalDealers = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) {
      toast({ title: 'No data', description: 'No records to export.' });
      return;
    }

    const headers = ['Dealer Name', 'Phone', 'Email', 'Wallet Balance', 'Created At', 'Status'];
    const rows = filteredData.map((item) => [
      item.name,
      item.phone,
      item.email,
      item.walletBalance.toFixed(2),
      item.createdAt,
      item.isActive ? 'Active' : 'Non Active',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dealers-list-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Dealers List</h1>
          <p className="text-sm text-muted-foreground">View registered dealers and their activity status</p>
        </div>
      </div>

      {/* Filter Row */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="non-active">Non Active</SelectItem>
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
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Dealers</p>
              <p className="text-2xl font-bold">{totalDealers}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredData.filter((d) => d.isActive).length}
              </p>
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
                <h2 className="text-xl font-bold">Dealers List History</h2>
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
                No dealer records found for the selected criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Dealer Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>Pkr {item.walletBalance.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? 'default' : 'secondary'}>
                          {item.isActive ? 'Active' : 'Non Active'}
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
