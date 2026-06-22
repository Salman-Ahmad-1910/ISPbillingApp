'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface RecoveryData {
  id: string;
  date: string;
  recoveryOfficer: string;
  area: string;
  amountCollected: number;
  targetAmount: number;
  accountsVisited: number;
  paymentsCollected: number;
  pendingPayments: number;
}

interface RecoverySummary {
  totalCollected: number;
  totalTarget: number;
  collectionRate: number;
  totalAccounts: number;
  totalPayments: number;
  pendingCount: number;
}

export function RecoveryReports() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecoveryData[]>([]);
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [recoveryOfficers, setRecoveryOfficers] = useState<{ id: string; name: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);

  const fetchRecoveryData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        officerId: selectedOfficer !== 'all' ? selectedOfficer : undefined,
        areaId: selectedArea !== 'all' ? selectedArea : undefined,
      };

      const [dataResponse, summaryResponse, officersResponse, areasResponse] = await Promise.all([
        api.get('/reports/recovery', { params }),
        api.get('/reports/recovery/summary', { params }),
        api.get('/hr/recovery-officers', { params: { companyId } }),
        api.get('/network/areas', { params: { companyId } }),
      ]);

      setData(dataResponse.data.data || []);
      setSummary(dataResponse.data.summary);
      setRecoveryOfficers(dataResponse.data.officers || []);
      setAreas(dataResponse.data.areas || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch recovery data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecoveryData();
  }, [companyId, dateRange, selectedOfficer, selectedArea]);

  const exportData = async () => {
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        officerId: selectedOfficer !== 'all' ? selectedOfficer : undefined,
        areaId: selectedArea !== 'all' ? selectedArea : undefined,
        format: 'excel',
      };

      const response = await api.get('/reports/recovery/export', { 
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recovery-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Recovery Officer</Label>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Officers</SelectItem>
                  {recoveryOfficers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      {officer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchRecoveryData} disabled={loading}>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₨{summary.totalCollected.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="mr-1 h-3 w-3" />
                Target: ₨{summary.totalTarget.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.collectionRate.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {summary.collectionRate >= 80 ? (
                  <><TrendingUp className="mr-1 h-3 w-3 text-green-500" /> Good Performance</>
                ) : (
                  <><TrendingDown className="mr-1 h-3 w-3 text-red-500" /> Needs Improvement</>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Accounts Visited</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalAccounts}</div>
              <div className="text-xs text-muted-foreground">Total visits</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payments Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalPayments}</div>
              <div className="text-xs text-muted-foreground">Successful collections</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingCount}</div>
              <div className="text-xs text-muted-foreground">Awaiting collection</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Details</CardTitle>
          <CardDescription>Daily recovery activities and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recovery Officer</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Amount Collected</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Collection Rate</TableHead>
                <TableHead>Accounts Visited</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading recovery data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No recovery data found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  const rate = item.targetAmount > 0 ? (item.amountCollected / item.targetAmount) * 100 : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{item.recoveryOfficer}</TableCell>
                      <TableCell>{item.area}</TableCell>
                      <TableCell className="font-medium">₨{item.amountCollected.toLocaleString()}</TableCell>
                      <TableCell>₨{item.targetAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={rate >= 80 ? 'default' : 'destructive'}>
                          {rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{item.accountsVisited}</TableCell>
                      <TableCell>{item.paymentsCollected}</TableCell>
                      <TableCell>{item.pendingPayments}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
