'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowLeft, Loader2 } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Button } from '@/components/ui/button';

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

interface CollectionRecord {
  id: string;
  subscriberName: string;
  subscriberId: string;
  connectionId: string;
  amount: number;
  paymentDate: string;
  method: string;
  address: string;
}

export default function CollectionDetailsPage() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'daily';
  const monthParam = searchParams.get('month') || '';
  const { companyId } = useCompany();

  const { data: payments = [], isLoading: loading } = useGenericQuery<any>('billing/payments', companyId ?? undefined);

  const filteredData = useMemo(() => {
    const now = new Date();
    const items = (payments as any[]).map((p: any) => ({
      id: p.id,
      subscriberName: p.subscriberName || p.subscriber?.name || '',
      subscriberId: p.subscriberId || '',
      connectionId: p.connectionId || p.subscriberId || '',
      amount: Number(p.amount) || 0,
      paymentDate: p.paymentDate || p.createdAt || '',
      method: p.method || 'cash',
      address: p.subscriber?.installationAddress || '',
    }));

    return items.filter((item: CollectionRecord) => {
      if (!item.paymentDate) return false;
      const d = new Date(item.paymentDate);

      switch (period) {
        case 'daily': {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return d >= startOfDay;
        }
        case 'weekly': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          return d >= weekAgo;
        }
        case 'monthly': {
          let targetMonth: string;
          if (monthParam) {
            targetMonth = monthParam;
          } else {
            targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          }
          const itemMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return itemMonth === targetMonth;
        }
        case 'yearly': {
          return d.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    });
  }, [payments, period, monthParam]);

  const totalAmount = filteredData.reduce((sum: number, item: CollectionRecord) => sum + item.amount, 0);

  const periodLabel = PERIOD_LABELS[period] || period;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{periodLabel} Collection Details</h1>
          <p className="text-sm text-muted-foreground">
            {period === 'daily' && "Today's collection entries"}
            {period === 'weekly' && "Last 7 days collection entries"}
            {period === 'monthly' && (monthParam ? `Collection for ${new Date(monthParam + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : "This month's collection entries")}
            {period === 'yearly' && "This year's collection entries"}
          </p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-green-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                <p className="text-3xl font-bold mt-1">{filteredData.length}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold mt-1">PKR {totalAmount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-10 w-10 opacity-30 mx-auto mb-3" />
              <p className="text-sm font-medium">No collection entries found</p>
              <p className="text-xs mt-1">No records available for the selected period.</p>
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item: CollectionRecord, i: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/crm/subscriber-detail?connectionId=${item.connectionId || item.subscriberId}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {item.subscriberName || 'Unknown'}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">PKR {item.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.method}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={item.address}>
                        {item.address || '---'}
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
  );
}
