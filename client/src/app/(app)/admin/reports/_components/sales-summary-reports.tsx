'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, TrendingDown, Users, Package, DollarSign } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface SalesData {
  id: string;
  date: string;
  period: string; // daily, weekly, monthly
  newSubscribers: number;
  totalSubscribers: number;
  revenue: number;
  packagesSold: { [packageName: string]: number };
  churnedSubscribers: number;
  netGrowth: number;
  averageRevenuePerUser: number;
  topSellingPackage: string;
  salesOfficer: string;
}

interface SalesSummary {
  totalRevenue: number;
  totalSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;
  netGrowth: number;
  averageRevenuePerUser: number;
  topSellingPackage: string;
  packageBreakdown: { name: string; count: number; revenue: number }[];
  monthlyTrend: { month: string; subscribers: number; revenue: number; growth: number }[];
  salesOfficerPerformance: { officer: string; sales: number; revenue: number }[];
}

export function SalesSummaryReports() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [period, setPeriod] = useState<string>('daily');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<{ id: string; name: string }[]>([]);

  const fetchSalesData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        period,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        officerId: selectedOfficer !== 'all' ? selectedOfficer : undefined,
      };

      const response = await api.get('/reports/sales', { params });
      setData(response.data.data || []);
      setSummary(response.data.summary);
      setPackages(response.data.packages || []);
      setSalesOfficers(response.data.salesOfficers || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch sales data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [companyId, dateRange, period, selectedPackage, selectedOfficer]);

  const exportData = async () => {
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        period,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        officerId: selectedOfficer !== 'all' ? selectedOfficer : undefined,
        format: 'excel',
      };

      const response = await api.get('/reports/sales/export', { 
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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

  const getGrowthBadge = (growth: number) => {
    if (growth > 0) {
      return <Badge className="bg-green-100 text-green-800">+{growth}%</Badge>;
    } else if (growth < 0) {
      return <Badge className="bg-red-100 text-red-800">{growth}%</Badge>;
    } else {
      return <Badge variant="secondary">0%</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your sales report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
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
              <Label>Sales Officer</Label>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Officers</SelectItem>
                  {salesOfficers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      {officer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchSalesData} disabled={loading}>
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
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₨{summary.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Selected period</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Subscribers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalSubscribers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Active accounts</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  New Subscribers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+{summary.newSubscribers}</div>
                <div className="text-xs text-muted-foreground">New signups</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Churned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">-{summary.churnedSubscribers}</div>
                <div className="text-xs text-muted-foreground">Lost subscribers</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.netGrowth >= 0 ? '+' : ''}{summary.netGrowth}
                </div>
                <div className="text-xs text-muted-foreground">Net change</div>
              </CardContent>
            </Card>
          </div>

          {/* Package Breakdown & Top Performers */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Package Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.packageBreakdown.map((pkg) => (
                    <div key={pkg.name} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{pkg.name}</span>
                        <div className="text-xs text-muted-foreground">{pkg.count} sales</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">₨{pkg.revenue.toLocaleString()}</Badge>
                        {pkg.name === summary.topSellingPackage && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800">Top</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales Officer Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.salesOfficerPerformance.map((officer) => (
                    <div key={officer.officer} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{officer.officer}</span>
                        <div className="text-xs text-muted-foreground">{officer.sales} sales</div>
                      </div>
                      <Badge variant="secondary">₨{officer.revenue.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
          <CardDescription>Sales performance by {period}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>New Subscribers</TableHead>
                <TableHead>Total Subscribers</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>ARPU</TableHead>
                <TableHead>Churned</TableHead>
                <TableHead>Net Growth</TableHead>
                <TableHead>Top Package</TableHead>
                <TableHead>Sales Officer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading sales data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No sales data found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {period === 'daily' 
                        ? format(new Date(item.date), 'dd MMM yyyy')
                        : period === 'weekly'
                        ? `Week ${format(new Date(item.date), 'w MMM yyyy')}`
                        : format(new Date(item.date), 'MMM yyyy')
                      }
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">+{item.newSubscribers}</TableCell>
                    <TableCell className="font-medium">{item.totalSubscribers.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">₨{item.revenue.toLocaleString()}</TableCell>
                    <TableCell>₨{item.averageRevenuePerUser.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600 font-medium">-{item.churnedSubscribers}</TableCell>
                    <TableCell>
                      {getGrowthBadge(item.netGrowth)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.topSellingPackage}</Badge>
                    </TableCell>
                    <TableCell>{item.salesOfficer}</TableCell>
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
