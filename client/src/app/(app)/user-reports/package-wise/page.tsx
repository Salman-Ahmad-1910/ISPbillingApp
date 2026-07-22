'use client';

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface PackageData {
  packageId: string;
  packageName: string;
  internetId: string;
  amount: number;
  installDate: string;
  subscriberCount: number;
}

export default function PackageWiseReportsPage() {
  const { companyId, companies } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: packages = [], isLoading: loadingPackages } = useGenericQuery<any>('billing/packages', companyId ?? undefined);
  const { data: subscribers = [], isLoading: loadingSubscribers } = useGenericQuery<any>('subscribers', companyId ?? undefined);

  const loading = loadingPackages || loadingSubscribers;

  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedPackage, setSelectedPackage] = useState('all');
  const [filterBy, setFilterBy] = useState('all');
  const [filterValue, setFilterValue] = useState('');

  // Package wise data
  const packageData: PackageData[] = useMemo(() => {
    const packageMap = new Map<string, any>();
    packages.forEach((p: any) => {
      packageMap.set(p.id || p.name, p);
    });

    const subscriberCounts = new Map<string, number>();
    subscribers.forEach((s: any) => {
      const pkgId = s.packageId || s.packageName || 'unknown';
      subscriberCounts.set(pkgId, (subscriberCounts.get(pkgId) || 0) + 1);
    });

    return Array.from(packageMap.entries()).map(([id, pkg]) => ({
      packageId: id,
      packageName: pkg.name || id,
      internetId: pkg.id?.slice(0, 8) || id.slice(0, 8),
      amount: Number(pkg.price) || 0,
      installDate: pkg.createdAt || '',
      subscriberCount: subscriberCounts.get(id) || 0,
    }));
  }, [packages, subscribers]);

  const filteredData = packageData.filter((item) => {
    const pkgMatch = selectedPackage === 'all' || item.packageId === selectedPackage || item.packageName === selectedPackage;
    let filterMatch = true;
    if (filterBy !== 'all' && filterValue) {
      const val = filterValue.toLowerCase();
      if (filterBy === 'internet_id') {
        filterMatch = item.internetId.toLowerCase().includes(val);
      } else if (filterBy === 'amount') {
        filterMatch = item.amount.toString().includes(val);
      } else if (filterBy === 'install_date') {
        filterMatch = item.installDate.toLowerCase().includes(val);
      }
    }
    return pkgMatch && filterMatch;
  });

  const totalCount = filteredData.reduce((sum, item) => sum + item.subscriberCount, 0);
  const totalPackages = filteredData.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 shadow-sm">
          <Box className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Package Wise Reports</h1>
          <p className="text-sm text-muted-foreground">View package-wise subscriber distribution and details</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-sky-500/30 via-blue-500/30 to-transparent" />

      {/* Filter Row */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Internet Packages */}
            <div className="space-y-2">
              <Label>Internet Packages</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map((p: any) => (
                    <SelectItem key={p.id} value={p.id || p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter By */}
            <div className="space-y-2">
              <Label>Filter By</Label>
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">None</SelectItem>
                  <SelectItem value="internet_id">Internet ID</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="install_date">Install Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Value */}
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                placeholder="Enter filter value..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                disabled={filterBy === 'all'}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => {}} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Package Wise Reports */}
      <div ref={reportRef} className="print-report">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Package Wise Reports</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Package-wise subscriber distribution
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No package data found for the selected criteria.
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Package Name</TableHead>
                      <TableHead>Internet ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Install Date</TableHead>
                      <TableHead>Subscriber Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.packageId}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{item.packageName}</TableCell>
                        <TableCell>{item.internetId}</TableCell>
                        <TableCell>Pkr {item.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{item.installDate ? format(new Date(item.installDate), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>{item.subscriberCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total Packages</p>
                  <Box className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
                </div>
                <p className="text-2xl font-bold mt-2">{totalPackages}</p>
              </div>
              <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total Subscribers</p>
                  <Box className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:scale-110" />
                </div>
                <p className="text-2xl font-bold mt-2">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
