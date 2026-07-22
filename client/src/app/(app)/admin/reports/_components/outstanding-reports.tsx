'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface OutstandingData {
  id: string;
  subscriberName: string;
  subscriberId: string;
  area: string;
  package: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
  lastPaymentDate: string;
  status: 'current' | 'overdue' | 'critical';
  recoveryOfficer: string;
}

interface OutstandingSummary {
  totalOutstanding: number;
  currentAmount: number;
  overdueAmount: number;
  criticalAmount: number;
  totalAccounts: number;
  overdueAccounts: number;
  criticalAccounts: number;
  averageOverdueDays: number;
}

export function OutstandingReports() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OutstandingData[]>([]);
  const [summary, setSummary] = useState<OutstandingSummary | null>(null);
  
  // Filters
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);

  const fetchOutstandingData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const params = {
        companyId,
        asOfDate: format(asOfDate, 'yyyy-MM-dd'),
        areaId: selectedArea !== 'all' ? selectedArea : undefined,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
      };

      const [dataResponse, areasResponse, packagesResponse] = await Promise.all([
        api.get('/reports/outstanding', { params }),
        api.get('/network/areas', { params: { companyId } }),
        api.get('/billing/packages', { params: { companyId } }),
      ]);

      setData(dataResponse.data.data || []);
      setSummary(dataResponse.data.summary);
      setAreas(dataResponse.data.areas || []);
      setPackages(dataResponse.data.packages || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch outstanding data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstandingData();
  }, [companyId, asOfDate, selectedArea, selectedPackage, statusFilter, minAmount, maxAmount]);

  const exportData = async () => {
    try {
      const params = {
        companyId,
        asOfDate: format(asOfDate, 'yyyy-MM-dd'),
        areaId: selectedArea !== 'all' ? selectedArea : undefined,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
        format: 'excel',
      };

      const response = await api.get('/reports/outstanding/export', { 
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `outstanding-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Success', description: 'Report exported successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to export report',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge variant="secondary">Current</Badge>;
      case 'overdue':
        return <Badge variant="outline">Overdue</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'text-green-600';
      case 'overdue':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your outstanding report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !asOfDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {asOfDate ? format(asOfDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={asOfDate}
                    onSelect={(date) => date && setAsOfDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Area</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Min Amount</Label>
              <Input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Amount</Label>
              <Input
                type="number"
                placeholder="999999"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchOutstandingData} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₨{summary.totalOutstanding.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {summary.totalAccounts} accounts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Current</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₨{summary.currentAmount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {summary.totalAccounts - summary.overdueAccounts - summary.criticalAccounts} accounts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">₨{summary.overdueAmount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {summary.overdueAccounts} accounts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₨{summary.criticalAmount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {summary.criticalAccounts} accounts
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Details</CardTitle>
          <CardDescription>Subscriber outstanding balances and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid Amount</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recovery Officer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading outstanding data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No outstanding data found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.subscriberName}</div>
                        <div className="text-sm text-muted-foreground">{item.subscriberId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.area}</TableCell>
                    <TableCell>{item.package}</TableCell>
                    <TableCell>₨{item.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>₨{item.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">₨{item.outstandingAmount.toLocaleString()}</TableCell>
                    <TableCell>{format(new Date(item.dueDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className={getStatusColor(item.status)}>
                      {item.daysOverdue}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{item.recoveryOfficer}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
