'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  internetId: string;
  name: string;
  cnic: string;
  address: string;
  leavingDate: string;
  reason: string;
  comments: string;
  mobile: string;
  connectionType: string;
  amount: number;
  badDebt: boolean;
}

export default function DeactivatedUsersPage() {
  const { companyId } = useCompany();

  const { data: connections = [], isLoading: loading } = useGenericQuery<any>('admin/connections', companyId ?? undefined);

  const [filterFromDate, setFilterFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filterFromDateOpen, setFilterFromDateOpen] = useState(false);
  const [filterToDate, setFilterToDate] = useState<Date>(new Date());
  const [filterToDateOpen, setFilterToDateOpen] = useState(false);

  const [connectionType, setConnectionType] = useState('both');
  const [badDebtFilter, setBadDebtFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const deactivatedData: DeactivatedRecord[] = useMemo(() => {
    return connections
      .filter((c: any) => c.status === 'deactivated')
      .map((c: any) => ({
        id: c.id,
        internetId: c.internetId || '',
        name: c.name || '',
        cnic: c.cnic || '',
        address: c.address || '',
        leavingDate: c.leavingDate || c.updatedAt || '',
        reason: c.deactivationReason || '',
        comments: c.comments || '',
        mobile: c.mobile || c.cell || '',
        connectionType: c.connectionType || 'both',
        amount: Number(c.remainingAmount) || 0,
        badDebt: !!c.badDebt,
      }));
  }, [connections]);

  const filteredData = useMemo(() => deactivatedData.filter((item) => {
    const connectionMatch = connectionType === 'both' || item.connectionType === connectionType;
    const badDebtMatch = badDebtFilter === 'all' ||
      (badDebtFilter === 'yes' && item.badDebt) ||
      (badDebtFilter === 'no' && !item.badDebt);
    const searchMatch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.internetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cnic.includes(searchTerm);

    return connectionMatch && badDebtMatch && searchMatch;
  }), [deactivatedData, connectionType, badDebtFilter, searchTerm]);

  const totalRecords = filteredData.length;

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = ['ID', 'Internet ID', 'Name', 'CNIC', 'Address', 'Leaving Date', 'Reason', 'Comments', 'Mobile No', 'Cable/Internet', 'Amount', 'Bad Debt'];
    const rows = filteredData.map((item) => [
      item.id, item.internetId, item.name, item.cnic, item.address,
      item.leavingDate ? format(new Date(item.leavingDate), 'dd MMM yyyy') : '',
      item.reason, item.comments, item.mobile, item.connectionType,
      item.amount.toFixed(2), item.badDebt ? 'Yes' : 'No',
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by name, ID, or CNIC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              <Label>Bad Debt</Label>
              <Select value={badDebtFilter} onValueChange={setBadDebtFilter}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
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
                  {totalRecords} deactivated subscribers
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
                      <TableHead>ID</TableHead>
                      <TableHead>Internet ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>CNIC</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Leaving Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Mobile No</TableHead>
                      <TableHead>Cable/Internet</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bad Debt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs">{item.id.slice(0, 8)}...</TableCell>
                        <TableCell>{item.internetId}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/subscriber-detail?connectionId=${item.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell>{item.cnic || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{item.address || '-'}</TableCell>
                        <TableCell>{item.leavingDate ? format(new Date(item.leavingDate), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>{item.reason || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{item.comments || '-'}</TableCell>
                        <TableCell>{item.mobile || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.connectionType}</Badge>
                        </TableCell>
                        <TableCell>PKR {item.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {item.badDebt ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
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
