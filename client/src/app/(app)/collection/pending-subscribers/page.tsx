'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, ArrowLeft, Users, Wallet, Loader2, Search } from 'lucide-react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Button } from '@/components/ui/button';
import type { Connection } from '@/lib/types';
import { smartMatchScore } from '@/lib/search';

function getPackagePrice(c: Connection): number {
  const cable = Number(c.amount) || 0;
  const internet = Number(c.sameAmount) || 0;
  if (c.connectionType === 'tv_cable') return cable;
  if (c.connectionType === 'internet') return internet;
  return cable + internet;
}

function getRemainingAmount(c: Connection): number {
  const pkgFee = getPackagePrice(c);
  const received = Number(c.remainingAmount) || 0;
  if (pkgFee === 0) return 0;
  // remainingAmount on connection = what's still owed after this month's payments
  return Number(c.remainingAmount) || pkgFee;
}

export default function PendingSubscribersPage() {
  const { companyId } = useCompany();
  const [search, setSearch] = useState('');

  const { data: connections = [], isLoading: loading } = useGenericQuery<Connection>(
    'admin/connections',
    companyId ?? undefined,
  );

  const pendingSubscribers = useMemo(() => {
    return (connections as Connection[]).filter(c => c.paymentStatus === 'pending');
  }, [connections]);

  const filteredSubscribers = useMemo(() => {
    if (!search.trim()) return pendingSubscribers;
    const q = search.trim();
    return pendingSubscribers
      .map(c => ({ c, s: smartMatchScore(q, [c.internetId, c.id, c.cell, c.mobile], [c.name]) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map(x => x.c);
  }, [pendingSubscribers, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Subscribers</h1>
          <p className="text-sm text-muted-foreground">Subscribers who paid less than the package fee</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="text-3xl font-bold mt-1">{pendingSubscribers.length}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending Amount</p>
                <p className="text-3xl font-bold mt-1">
                  PKR {pendingSubscribers.reduce((sum, c) => sum + (Number(c.remainingAmount) || getPackagePrice(c)), 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, or internet ID..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 opacity-30 mx-auto mb-3" />
              <p className="text-sm font-medium">No pending subscribers</p>
              <p className="text-xs mt-1">All subscribers have received full package fee payments.</p>
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Package Fee</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/crm/subscriber-detail?connectionId=${c.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.id?.slice(0, 8) || '---'}</TableCell>
                      <TableCell>{c.cell || c.mobile || '---'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={c.address}>
                        {c.address || '---'}
                      </TableCell>
                      <TableCell>{c.packageInternet || c.packageCable || '---'}</TableCell>
                      <TableCell className="font-semibold">
                        PKR {getPackagePrice(c).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-amber-600">
                        PKR {(Number(c.remainingAmount) || getPackagePrice(c)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Pending</Badge>
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
