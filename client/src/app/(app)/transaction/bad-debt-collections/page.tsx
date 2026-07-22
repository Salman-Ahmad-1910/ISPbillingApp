'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useUser } from '@/hooks/use-user';
import { Loader2, MoreHorizontal, PlusCircle, TriangleAlert, Users, DollarSign, AlertTriangle, UserCheck } from 'lucide-react';

import type { Connection, Dealer, Payment, Area, RecoveryOfficer } from '@/lib/types';

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function BadDebtCollectionsPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState('subscribers');

  // Subscriber state
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Dealer state
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [showDealerReceiveDialog, setShowDealerReceiveDialog] = useState(false);
  const [dealerReceiveAmount, setDealerReceiveAmount] = useState(0);
  const [isSavingDealer, setIsSavingDealer] = useState(false);

  // Data
  const { data: connections = [], isLoading: isLoadingConnections } = useGenericQuery<Connection>(
    'admin/connections',
    companyId ?? undefined,
  );

  const { data: dealers = [], isLoading: isLoadingDealers } = useGenericQuery<Dealer>(
    'dealers',
    companyId ?? undefined,
  );

  const { data: areas = [] } = useGenericQuery<Area>(
    'network/areas',
    companyId ?? undefined,
  );

  const { data: recoveryOfficers = [] } = useGenericQuery<RecoveryOfficer>(
    'admin/recovery-officers',
    companyId ?? undefined,
  );

  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useGenericQuery<Payment>(
    selectedSubscriberId ? 'billing/payments' : null,
    selectedSubscriberId ? companyId ?? undefined : undefined,
  );

  const { data: dealerCollections = [], refetch: refetchDealerCollections } = useGenericQuery<any>(
    selectedDealerId ? 'dealers/collections' : null,
    selectedDealerId ? companyId ?? undefined : undefined,
  );

  // --- Overdue filtering ---
  function getLastActiveDate(c: Connection): string {
    // Use lastPaymentDate if available, fall back to rechargeDate, then createdAt
    return c.lastPaymentDate || c.rechargeDate || c.createdAt;
  }

  const overdueConnections = useMemo(() => {
    return (connections as Connection[]).filter(c => {
      const activeDate = getLastActiveDate(c);
      if (!activeDate) return false;
      const daysSince = getDaysSince(activeDate);
      return daysSince > 30;
    });
  }, [connections]);

  const overdueDealers = useMemo(() => {
    return (dealers as Dealer[]).filter(d => Number(d.walletBalance) > 0);
  }, [dealers]);

  function getDealerLastActiveDate(d: Dealer): string {
    return d.lastPaymentDate || d.createdAt;
  }

  // --- Subscriber selection ---
  const subscriberOptions = useMemo(() => {
    return overdueConnections.map(c => ({
      id: c.id,
      name: c.name,
      secondary: `Overdue ${getDaysSince(getLastActiveDate(c))} days`,
    }));
  }, [overdueConnections]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return (connections as Connection[]).find(c => c.id === selectedSubscriberId) || null;
  }, [connections, selectedSubscriberId]);

  // --- Dealer selection ---
  const dealerOptions = useMemo(() => {
    return overdueDealers.map(d => {
      const daysSince = getDaysSince(getDealerLastActiveDate(d));
      const daysText = d.lastPaymentDate ? `${daysSince} days since payment` : 'Never paid';
      return {
        id: d.id,
        name: d.name,
        secondary: `Rs.${d.walletBalance} outstanding • ${daysText}`,
      };
    });
  }, [overdueDealers]);

  const selectedDealer = useMemo(() => {
    if (!selectedDealerId) return null;
    return (dealers as Dealer[]).find(d => d.id === selectedDealerId) || null;
  }, [dealers, selectedDealerId]);

  const dealerPayments = useMemo(() => {
    if (!selectedDealerId) return [];
    const all = dealerCollections as any[];
    return all.filter(c => c.dealerId === selectedDealerId);
  }, [dealerCollections, selectedDealerId]);

  const subscriberPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    const all = payments as Payment[];
    return all.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  // --- Recovery officer resolution (subscriber: connection.sublocalityId -> area -> officer) ---
  const subscriberRecoveryOfficerName = useMemo(() => {
    if (!selectedSubscriber) return user?.name || '---';
    if (selectedSubscriber.sublocalityId) {
      const area = (areas as Area[]).find(a => a.id === selectedSubscriber.sublocalityId);
      if (area) {
        if (area.recoveryOfficerId) {
          const o = (recoveryOfficers as RecoveryOfficer[]).find(o => o.id === area.recoveryOfficerId);
          if (o) return o.name;
        }
        const o = (recoveryOfficers as RecoveryOfficer[]).find(o => o.areaId === area.id);
        if (o) return o.name;
      }
    }
    const o = (recoveryOfficers as RecoveryOfficer[]).find(o => o.id === user?.id);
    return o?.name || user?.name || '---';
  }, [selectedSubscriber, areas, recoveryOfficers, user]);

  // --- Recovery officer resolution (dealer: dealer.areaId -> area -> officer) ---
  const dealerRecoveryOfficerName = useMemo(() => {
    if (!selectedDealer) return user?.name || '---';
    if (selectedDealer.areaId) {
      const area = (areas as Area[]).find(a => a.id === selectedDealer.areaId);
      if (area && area.recoveryOfficerId) {
        const o = (recoveryOfficers as RecoveryOfficer[]).find(o => o.id === area.recoveryOfficerId);
        if (o) return o.name;
      }
    }
    const o = (recoveryOfficers as RecoveryOfficer[]).find(o => o.id === user?.id);
    return o?.name || user?.name || '---';
  }, [selectedDealer, areas, recoveryOfficers, user]);

  // --- Handlers ---
  const handleReceivePayment = async () => {
    if (!selectedSubscriber || !user) return;
    setIsSaving(true);
    try {
      await api.post('/billing/payments', {
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: receiveAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'cash',
        collectorId: user.id,
      });
      toast({ title: 'Success', description: 'Payment recorded.' });
      setShowReceiveDialog(false);
      refetchPayments();
      setReceiveAmount(0);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed' });
    } finally { setIsSaving(false); }
  };

  const handleDealerReceive = async () => {
    if (!selectedDealer || !user) return;
    setIsSavingDealer(true);
    try {
      await api.post('/dealers/collections', {
        dealerId: selectedDealer.id,
        dealerName: selectedDealer.name,
        dealerAddress: selectedDealer.address || '',
        amount: dealerReceiveAmount,
        collectionDate: new Date().toISOString().split('T')[0],
        settlementStatus: 'settled',
        transactionType: 'cash',
        receivedById: user.id,
      });
      toast({ title: 'Success', description: 'Dealer payment recorded.' });
      setShowDealerReceiveDialog(false);
      refetchDealerCollections();
      setDealerReceiveAmount(0);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed' });
    } finally { setIsSavingDealer(false); }
  };

  const isLoading = isLoadingConnections || isLoadingDealers;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm">
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bad Debt Collections</h1>
          <p className="text-sm text-muted-foreground">Collect overdue payments from subscribers and dealers.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-rose-500/50 via-red-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-red-600 p-2.5 text-white shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Overdue Subscribers</p>
              <p className="text-2xl font-bold">{overdueConnections.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Overdue Dealers</p>
              <p className="text-2xl font-bold">{overdueDealers.length}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-destructive to-red-700 p-2.5 text-white shadow-sm">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Connections</p>
              <p className="text-2xl font-bold">{Array.isArray(connections) ? connections.length : 0}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Dealers</p>
              <p className="text-2xl font-bold">{Array.isArray(dealers) ? dealers.length : 0}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="mt-4">
          <Card>
            <div className="p-4 border-b">
              <div className="max-w-md">
                <SearchableSelect
                  value={selectedSubscriberId}
                  onValueChange={setSelectedSubscriberId}
                  options={subscriberOptions}
                  placeholder="Search overdue subscribers..."
                  searchPlaceholder="Type to search by name..."
                  label="Select Subscriber"
                />
              </div>
            </div>

            {selectedSubscriber ? (
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Subscriber ID</Label>
                      <p className="font-medium font-mono text-sm">{selectedSubscriber.id?.slice(0, 8) || '---'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedSubscriber.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Days Overdue</Label>
                      <p className="font-medium text-destructive">{getDaysSince(getLastActiveDate(selectedSubscriber))} days</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Payment</Label>
                      <p className="font-medium">{selectedSubscriber.lastPaymentDate ? new Date(selectedSubscriber.lastPaymentDate).toLocaleDateString() : selectedSubscriber.rechargeDate ? new Date(selectedSubscriber.rechargeDate).toLocaleDateString() : '---'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Mobile</Label>
                      <p className="font-medium">{selectedSubscriber.mobile || selectedSubscriber.cell || '---'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <p className="font-medium truncate" title={selectedSubscriber.address}>{selectedSubscriber.address || '---'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <p className="font-medium text-violet-600 dark:text-violet-400">PKR {selectedSubscriber.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Remaining</Label>
                      <p className={`font-medium ${(selectedSubscriber.remainingAmount || selectedSubscriber.sameAmount || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        PKR {(selectedSubscriber.remainingAmount || selectedSubscriber.sameAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-b flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    <span>Receiving as: <span className="font-medium text-foreground">{subscriberRecoveryOfficerName}</span></span>
                  </div>
                  <div className="flex-1" />
                  <Button onClick={() => setShowReceiveDialog(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Receive Payment
                  </Button>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">{selectedSubscriber.name}&apos;s Payment History</h3>
                  {isLoadingPayments ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : subscriberPayments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No payment history found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-1 px-1.5">#</TableHead>
                            <TableHead className="py-1 px-1.5">Bill #</TableHead>
                            <TableHead className="py-1 px-1.5">Name</TableHead>
                            <TableHead className="py-1 px-1.5">Month/Year</TableHead>
                            <TableHead className="py-1 px-1.5">Type</TableHead>
                            <TableHead className="py-1 px-1.5">Received</TableHead>
                            <TableHead className="py-1 px-1.5">Pay Date</TableHead>
                            <TableHead className="py-1 px-1.5">Status</TableHead>
                            <TableHead className="py-1 px-1.5">Received By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriberPayments.map((payment, idx) => (
                            <TableRow key={payment.id}>
                              <TableCell className="py-1.5 px-1.5 font-mono">{idx + 1}</TableCell>
                              <TableCell className="py-1.5 px-1.5 font-mono">{payment.id.slice(0, 8).toUpperCase()}</TableCell>
                              <TableCell className="py-1.5 px-1.5">{payment.subscriberName}</TableCell>
                              <TableCell className="py-1.5 px-1.5">
                                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '---'}
                              </TableCell>
                              <TableCell className="py-1.5 px-1.5 capitalize">{payment.method || 'cash'}</TableCell>
                              <TableCell className="py-1.5 px-1.5 font-medium">PKR {payment.amount.toLocaleString()}</TableCell>
                              <TableCell className="py-1.5 px-1.5">
                                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '---'}
                              </TableCell>
                              <TableCell className="py-1.5 px-1.5">
                                <Badge variant="default" className="bg-green-600 text-[10px] px-1.5 py-0">Paid</Badge>
                              </TableCell>
                              <TableCell className="py-1.5 px-1.5">{subscriberRecoveryOfficerName}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <h3 className="text-lg font-medium mb-2">No Subscriber Selected</h3>
                  <p>Search and select an overdue subscriber to receive payment.</p>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="dealers" className="mt-4">
          <Card>
            <div className="p-4 border-b">
              <div className="max-w-md">
                <SearchableSelect
                  value={selectedDealerId}
                  onValueChange={setSelectedDealerId}
                  options={dealerOptions}
                  placeholder="Search overdue dealers..."
                  searchPlaceholder="Type to search by name..."
                  label="Select Dealer"
                />
              </div>
            </div>

            {selectedDealer ? (
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Dealer ID</Label>
                      <p className="font-medium font-mono text-sm">{selectedDealer.id?.slice(0, 8) || '---'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedDealer.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedDealer.phone || '---'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Balance</Label>
                      <p className="font-medium text-destructive">PKR {selectedDealer.walletBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Remaining</Label>
                      <p className={`font-medium ${(selectedDealer.remainingAmount || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        PKR {(selectedDealer.remainingAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Payment</Label>
                      <p className="font-medium">{selectedDealer.lastPaymentDate ? new Date(selectedDealer.lastPaymentDate).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-b flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    <span>Receiving as: <span className="font-medium text-foreground">{dealerRecoveryOfficerName}</span></span>
                  </div>
                  <div className="flex-1" />
                  <Button onClick={() => setShowDealerReceiveDialog(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Receive Payment
                  </Button>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">{selectedDealer.name}&apos;s Payment History</h3>
                  {dealerPayments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No payment history found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-1 px-1.5">#</TableHead>
                            <TableHead className="py-1 px-1.5">Bill #</TableHead>
                            <TableHead className="py-1 px-1.5">Dealer</TableHead>
                            <TableHead className="py-1 px-1.5">Date</TableHead>
                            <TableHead className="py-1 px-1.5">Type</TableHead>
                            <TableHead className="py-1 px-1.5">Amount</TableHead>
                            <TableHead className="py-1 px-1.5">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dealerPayments.map((col: any, idx: number) => (
                            <TableRow key={col.id}>
                              <TableCell className="py-1.5 px-1.5 font-mono">{idx + 1}</TableCell>
                              <TableCell className="py-1.5 px-1.5 font-mono">{col.id.slice(0, 8).toUpperCase()}</TableCell>
                              <TableCell className="py-1.5 px-1.5">{col.dealerName}</TableCell>
                              <TableCell className="py-1.5 px-1.5">{col.collectionDate || '---'}</TableCell>
                              <TableCell className="py-1.5 px-1.5 capitalize">{col.transactionType || 'cash'}</TableCell>
                              <TableCell className="py-1.5 px-1.5 font-medium">PKR {col.amount?.toLocaleString()}</TableCell>
                              <TableCell className="py-1.5 px-1.5">
                                <Badge variant={col.settlementStatus === 'settled' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                  {col.settlementStatus === 'settled' ? 'Settled' : 'Pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <h3 className="text-lg font-medium mb-2">No Dealer Selected</h3>
                  <p>Search and select an overdue dealer to receive payment.</p>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subscriber Receive Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Subscriber ID</Label>
                <Input value={selectedSubscriber?.id?.slice(0, 8) || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Subscriber Name</Label>
                <Input value={selectedSubscriber?.name || ''} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Received By</Label>
              <Input value={subscriberRecoveryOfficerName} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Amount (PKR)</Label>
              <Input type="number" value={receiveAmount} onChange={e => setReceiveAmount(parseFloat(e.target.value) || 0)} placeholder="Enter amount" />
            </div>
            <Button onClick={handleReceivePayment} disabled={isSaving || !receiveAmount} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Receive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dealer Receive Dialog */}
      <Dialog open={showDealerReceiveDialog} onOpenChange={setShowDealerReceiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Dealer Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Dealer ID</Label>
                <Input value={selectedDealer?.id?.slice(0, 8) || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Dealer Name</Label>
                <Input value={selectedDealer?.name || ''} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Received By</Label>
              <Input value={dealerRecoveryOfficerName} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Amount (PKR)</Label>
              <Input type="number" value={dealerReceiveAmount} onChange={e => setDealerReceiveAmount(parseFloat(e.target.value) || 0)} placeholder="Enter amount" />
            </div>
            <Button onClick={handleDealerReceive} disabled={isSavingDealer || !dealerReceiveAmount} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              {isSavingDealer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Receive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
