'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Loader2, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';

interface PackageData {
  packageName: string;
  amount: number;
  subscriberCount: number;
}

export default function PackageWiseReportsPage() {
  const { companyId } = useCompany();

  const { data: packages = [], isLoading: loadingPackages } = useGenericQuery<any>('billing/packages', companyId ?? undefined);
  const { data: connections = [], isLoading: loadingConnections } = useGenericQuery<any>('admin/connections', companyId ?? undefined);

  const loading = loadingPackages || loadingConnections;

  const [selectedPackage, setSelectedPackage] = useState('all');
  const [connectionType, setConnectionType] = useState('both');
  const [searchTerm, setSearchTerm] = useState('');

  const packageData: PackageData[] = useMemo(() => {
    return packages.map((pkg: any) => {
      const pkgName = pkg.name || '';
      const count = connections.filter((c: any) => {
        const matchesInternet = c.packageInternet && c.packageInternet === pkgName;
        const matchesCable = c.packageCable && c.packageCable === pkgName;
        const typeMatch = connectionType === 'both' ||
          (connectionType === 'internet' && matchesInternet) ||
          (connectionType === 'tv_cable' && matchesCable);
        return typeMatch && (matchesInternet || matchesCable);
      }).length;

      return {
        packageName: pkgName,
        amount: Number(pkg.price) || 0,
        subscriberCount: count,
      };
    }).filter((p: PackageData) => p.packageName);
  }, [packages, connections, connectionType]);

  const filteredData = useMemo(() => packageData.filter((item) => {
    const pkgMatch = selectedPackage === 'all' || item.packageName === selectedPackage;
    const searchMatch = !searchTerm || item.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    return pkgMatch && searchMatch;
  }), [packageData, selectedPackage, searchTerm]);

  const totalSubscribers = filteredData.reduce((sum, item) => sum + item.subscriberCount, 0);
  const totalPackages = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['Package Name', 'Amount', 'Subscriber Count'];
    const rows = filteredData.map((item) => [
      item.packageName, item.amount.toFixed(2), item.subscriberCount.toString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `package-wise-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
        <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 shadow-sm">
          <Box className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Package Wise Reports</h1>
          <p className="text-sm text-muted-foreground">View package-wise subscriber distribution and details</p>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-sky-500/50 via-blue-500/30 to-transparent no-print" />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 no-print">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Packages</p>
              <p className="text-2xl font-bold mt-1">{totalPackages}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Box className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Subscribers</p>
              <p className="text-2xl font-bold mt-1">{totalSubscribers}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Box className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="no-print transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map((p: any) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
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
              <Label>Search</Label>
              <Input
                placeholder="Search by package name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                <h2 className="text-xl font-bold">Package Wise Reports</h2>
                <p className="text-sm text-muted-foreground mt-1">Package-wise subscriber distribution</p>
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
                No package data found for the selected criteria.
              </div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Package Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Subscriber Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.packageName}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{item.packageName}</TableCell>
                        <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {item.subscriberCount > 0 ? (
                            <Link
                              href={`/crm/subscriber-detail?package=${encodeURIComponent(item.packageName)}`}
                              className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
                            >
                              {item.subscriberCount}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
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
