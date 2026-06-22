'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, TrendingUp, TrendingDown, Users, UserPlus, UserMinus, MapPin } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useToast } from '@/hooks/use-toast';

interface SubscriberData {
  id: string;
  date: string;
  period: string;
  totalSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;
  netGrowth: number;
  growthRate: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  suspendedSubscribers: number;
  areaBreakdown: { [areaName: string]: number };
  packageBreakdown: { [packageName: string]: number };
  averageTenure: number;
  churnRate: number;
}

interface SubscriberSummary {
  currentTotal: number;
  totalNew: number;
  totalChurned: number;
  netGrowth: number;
  overallGrowthRate: number;
  currentChurnRate: number;
  averageTenure: number;
  topGrowthArea: string;
  highestChurnArea: string;
  mostPopularPackage: string;
  areaDistribution: { area: string; count: number; percentage: number }[];
  packageDistribution: { package: string; count: number; percentage: number }[];
  monthlyTrend: { month: string; total: number; new: number; churned: number; churnRate: number }[];
  demographicBreakdown: {
    byArea: { area: string; total: number; new: number; churned: number; growthRate: number }[];
    byPackage: { package: string; total: number; new: number; churned: number; churnRate: number }[];
  };
}

export function SubscriberReports() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SubscriberData[]>([]);
  const [summary, setSummary] = useState<SubscriberSummary | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 3)),
    to: new Date()
  });
  const [period, setPeriod] = useState<string>('monthly');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('overview');
  
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);

  const fetchSubscriberData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        period,
        areaId: selectedArea !== 'all' ? selectedArea : undefined,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        reportType,
      };

      const response = await api.get('/reports/subscribers', { params });
      setData(response.data.data || []);
      setSummary(response.data.summary);
      setAreas(response.data.areas || []);
      setPackages(response.data.packages || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch subscriber data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriberData();
  }, [companyId, dateRange, period, selectedArea, selectedPackage, reportType]);

  const exportData = async () => {
    try {
      const params = {
        companyId,
        fromDate: format(dateRange.from, 'yyyy-MM-dd'),
        toDate: format(dateRange.to, 'yyyy-MM-dd'),
        period,
        areaId: selectedArea !== 'all' ? selectedArea : undefined,
        packageId: selectedPackage !== 'all' ? selectedPackage : undefined,
        reportType,
        format: 'excel',
      };

      const response = await api.get('/reports/subscribers/export', { 
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscriber-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
      return <Badge className="bg-green-100 text-green-800">+{growth.toFixed(1)}%</Badge>;
    } else if (growth < 0) {
      return <Badge className="bg-red-100 text-red-800">{growth.toFixed(1)}%</Badge>;
    } else {
      return <Badge variant="secondary">0%</Badge>;
    }
  };

  const getChurnBadge = (churnRate: number) => {
    if (churnRate <= 2) {
      return <Badge className="bg-green-100 text-green-800">{churnRate.toFixed(1)}%</Badge>;
    } else if (churnRate <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800">{churnRate.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{churnRate.toFixed(1)}%</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your subscriber report parameters</CardDescription>
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
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchSubscriberData} disabled={loading}>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.currentTotal.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Active subscribers</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-600" />
                  New Subscribers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+{summary.totalNew}</div>
                <div className="text-xs text-muted-foreground">New signups</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-red-600" />
                  Churned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">-{summary.totalChurned}</div>
                <div className="text-xs text-muted-foreground">Lost subscribers</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getChurnBadge(summary.currentChurnRate)}</div>
                <div className="text-xs text-muted-foreground">Monthly churn</div>
              </CardContent>
            </Card>
          </div>

          {/* Area & Package Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Area Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.areaDistribution.map((area) => (
                    <div key={area.area} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{area.area}</span>
                        <div className="text-xs text-muted-foreground">{area.count} subscribers</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${area.percentage}%` }}
                          ></div>
                        </div>
                        <Badge variant="outline">{area.percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Package Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.packageDistribution.map((pkg) => (
                    <div key={pkg.package} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{pkg.package}</span>
                        <div className="text-xs text-muted-foreground">{pkg.count} subscribers</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${pkg.percentage}%` }}
                          ></div>
                        </div>
                        <Badge variant="outline">{pkg.percentage.toFixed(1)}%</Badge>
                      </div>
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
          <CardTitle>Subscriber Analytics</CardTitle>
          <CardDescription>Subscriber growth and churn metrics by {period}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Total Subscribers</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Churned</TableHead>
                <TableHead>Net Growth</TableHead>
                <TableHead>Growth Rate</TableHead>
                <TableHead>Churn Rate</TableHead>
                <TableHead>Avg Tenure</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Inactive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading subscriber data...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No subscriber data found for the selected criteria.
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
                    <TableCell className="font-medium">{item.totalSubscribers.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600 font-medium">+{item.newSubscribers}</TableCell>
                    <TableCell className="text-red-600 font-medium">-{item.churnedSubscribers}</TableCell>
                    <TableCell>
                      {getGrowthBadge(item.growthRate)}
                    </TableCell>
                    <TableCell>
                      {getGrowthBadge(item.netGrowth)}
                    </TableCell>
                    <TableCell>
                      {getChurnBadge(item.churnRate)}
                    </TableCell>
                    <TableCell>{item.averageTenure.toFixed(1)} months</TableCell>
                    <TableCell className="text-green-600">{item.activeSubscribers}</TableCell>
                    <TableCell className="text-orange-600">{item.inactiveSubscribers}</TableCell>
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
