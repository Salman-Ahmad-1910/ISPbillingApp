'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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
import { useCompany } from '@/context/company-context';
import { useQueryClient } from '@tanstack/react-query';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useUser } from '@/hooks/use-user';
import { smartMatchScore } from '@/lib/search';
import { Loader2, MoreHorizontal, Wallet, DollarSign, UserCheck, Trash2, Pencil, Copy, FileText, Users, CalendarClock, Clock } from 'lucide-react';

import type { Connection, Payment, Area, RecoveryOfficer, TransactionType, PromiseEntry } from '@/lib/types';
import { SubscriberPrintDialog } from './_components/subscriber-print-dialog';

function getMonthsSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function getPackagePrice(c: Connection): number {
  const cable = Number(c.amount) || 0;
  const internet = Number(c.sameAmount) || 0;
  if (c.connectionType === 'tv_cable') return cable;
  if (c.connectionType === 'internet') return internet;
  return cable + internet;
}

function getTotalOwed(c: Connection): number {
  const remaining = Number(c.remainingAmount) || 0;
  const activeDate = c.lastPaymentDate || c.rechargeDate || c.createdAt;
  const months = getMonthsSince(activeDate);
  return remaining + getPackagePrice(c) * Math.max(0, months);
}

const STATUS_OPTIONS = [
  { id: 'paid', name: 'Paid' },
  { id: 'pending', name: 'Unpaid' },
];

export default function SubscriberCollectionsPage() {
  const { companyId, companies } = useCompany();
  const currentCompany = companies.find(c => c.id === companyId);
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);

  const [showPromiseDialog, setShowPromiseDialog] = useState(false);
  const [promiseDate, setPromiseDate] = useState(new Date().toISOString().split('T')[0]);
  const [promiseDescription, setPromiseDescription] = useState('');
  const [isSavingPromise, setIsSavingPromise] = useState(false);

  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveMethod, setReceiveMethod] = useState<string>('cash');
  const [receiveComment, setReceiveComment] = useState('');
  const [receiveTransactionId, setReceiveTransactionId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [printPayment, setPrintPayment] = useState<Payment | null>(null);
  const [printPromise, setPrintPromise] = useState<PromiseEntry | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printFormatChoice, setPrintFormatChoice] = useState<'a4' | 'thermal'>('a4');

  const [selectedPromiseId, setSelectedPromiseId] = useState<string | null>(null);

  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editTransactionId, setEditTransactionId] = useState('');
  const [editTransactionType, setEditTransactionType] = useState('');

  const { data: connections = [], isLoading: isLoadingSubscribers } = useGenericQuery<Connection>(
    'admin/connections',
    companyId ?? undefined,
  );

  // Fetch dashboard data so pending amount/count match the dashboard exactly
  const [dash, setDash] = useState<any>(null);
  useEffect(() => {
    if (!companyId) return;
    api.get(`/dashboard?companyId=${companyId}`)
      .then(r => setDash(r.data.data))
      .catch(() => {});
  }, [companyId]);

  const filteredSubscribers = useMemo(() => {
    const q = subscriberSearch.trim();
    if (!q) return [];
    const all = connections as Connection[];
    return all
      .filter(c => c.paymentStatus !== 'advance' && getPackagePrice(c) > 0)
      .map((c) => ({
        c,
        s: smartMatchScore(q, [c.internetId, c.id], [c.name], [c.cell, c.mobile]),
      }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((x) => x.c);
  }, [connections, subscriberSearch]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return (connections as Connection[]).find(c => c.id === selectedSubscriberId) || null;
  }, [connections, selectedSubscriberId]);

  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useGenericQuery<Payment>(
    selectedSubscriberId ? 'billing/payments' : null,
    selectedSubscriberId ? companyId ?? undefined : undefined,
  );

  const { data: promises = [], isLoading: isLoadingPromises, refetch: refetchPromises } = useGenericQuery<PromiseEntry>(
    selectedSubscriberId ? 'billing/promises' : null,
    selectedSubscriberId ? companyId ?? undefined : undefined,
  );

  const subscriberPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    const all = payments as Payment[];
    return all.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  const subscriberPromises = useMemo(() => {
    if (!selectedSubscriberId) return [];
    const all = promises as PromiseEntry[];
    return all.filter(p => p.subscriberId === selectedSubscriberId && p.status !== 'completed');
  }, [promises, selectedSubscriberId]);

  const totalSubscribers = useMemo(() => {
    if (!Array.isArray(connections)) return 0;
    return connections.length;
  }, [connections]);

  // Pending counts from the dashboard so both pages always match
  const totalPendingSubscribers = dash?.subscribersStats?.pending ?? 0;
  const totalPendingAmount = dash?.pendingAmount ?? 0;

  const totalAmount = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const { data: areas = [] } = useGenericQuery<Area>(
    'network/areas',
    companyId ?? undefined,
  );

  const { data: recoveryOfficers = [] } = useGenericQuery<RecoveryOfficer>(
    'admin/recovery-officers',
    companyId ?? undefined,
  );

  const { data: transactionTypes = [] } = useGenericQuery<TransactionType>(
    'billing/transaction-types',
    companyId ?? undefined,
  );

  const filteredTransactionTypes = useMemo(() => {
    const all = transactionTypes as TransactionType[];
    const seen = new Set<string>();
    return all.filter(t => {
      const name = t.paymentChannel || t.transaction;
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [transactionTypes]);

  const mergedPaymentOptions = useMemo(() => {
    const cashOption = { id: 'cash', name: 'Cash' };
    const txOptions = filteredTransactionTypes.map(t => ({
      id: t.paymentChannel || t.transaction,
      name: t.paymentChannel || t.transaction,
    }));
    return [cashOption, ...txOptions];
  }, [filteredTransactionTypes]);

  // Resolve the recovery officer assigned to the selected subscriber's area.
  // Chain: connection.sublocalityId (which is an Area ID) -> area -> recoveryOfficer
  // Tries both area.recoveryOfficerId and recoveryOfficer.areaId directions.
  const recoveryOfficerName = useMemo(() => {
    if (!selectedSubscriber) return user?.name || '---';
    let officer: RecoveryOfficer | undefined;
    if (selectedSubscriber.sublocalityId) {
      const area = (areas as Area[]).find(
        a => a.id === selectedSubscriber.sublocalityId
      );
      if (area) {
        if (area.recoveryOfficerId) {
          officer = (recoveryOfficers as RecoveryOfficer[]).find(
            o => o.id === area.recoveryOfficerId
          );
        }
        // Fallback: find officer whose areaId matches this area
        if (!officer) {
          officer = (recoveryOfficers as RecoveryOfficer[]).find(
            o => o.areaId === area.id
          );
        }
      }
    }
    return officer?.name || user?.name || '---';
  }, [selectedSubscriber, areas, recoveryOfficers, user]);

  const sublocalityName = useMemo(() => {
    if (!selectedSubscriber?.sublocalityId) return '';
    const area = (areas as Area[]).find(a => a.id === selectedSubscriber.sublocalityId);
    return area?.subLocality || area?.locality || '';
  }, [selectedSubscriber, areas]);

  useEffect(() => {
    if (showReceiveDialog && selectedSubscriber?.transactionId) {
      setReceiveTransactionId(selectedSubscriber.transactionId);
    }
  }, [showReceiveDialog, selectedSubscriber]);

  const packageFee = useMemo(
    () => (selectedSubscriber ? getPackagePrice(selectedSubscriber) : 0),
    [selectedSubscriber],
  );

  const totalReceivedThisMonth = useMemo(() => {
    if (!selectedSubscriber) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return subscriberPayments
      .filter((p: Payment) => {
        if (!p.paymentDate) return false;
        const d = new Date(p.paymentDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum: number, p: Payment) => sum + (Number(p.amount) || 0), 0);
  }, [selectedSubscriber, subscriberPayments]);

  const remainingAmount = useMemo(() => {
    if (!selectedSubscriber || !packageFee) return packageFee;
    return packageFee - totalReceivedThisMonth;
    // Negative = overpaid (advance), Positive = underpaid (pending), Zero = fully paid
  }, [selectedSubscriber, packageFee, totalReceivedThisMonth]);

  const displayRemaining = useMemo(() => {
    return Math.max(0, remainingAmount);
  }, [remainingAmount]);

  const advanceAmount = useMemo(() => {
    return remainingAmount < 0 ? Math.abs(remainingAmount) : 0;
  }, [remainingAmount]);

  const afterPaymentRemaining = useMemo(() => {
    return Math.max(0, remainingAmount - receiveAmount);
  }, [remainingAmount, receiveAmount]);

  const handlePromiseSave = async () => {
    if (!selectedSubscriber || !user) return;
    if (!promiseDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a promise date.' });
      return;
    }
    if (!promiseDescription.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a description for the promise.' });
      return;
    }
    setIsSavingPromise(true);
    try {
      await api.post('/billing/promises', {
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        internetId: selectedSubscriber.internetId,
        phone: selectedSubscriber.mobile || selectedSubscriber.cell || '',
        address: selectedSubscriber.address,
        sublocality: sublocalityName,
        connectionType: selectedSubscriber.connectionType,
        amount: getTotalOwed(selectedSubscriber),
        promiseDate,
        description: promiseDescription.trim(),
        status: 'pending',
        collectorId: user.id,
        collectorName: recoveryOfficerName,
      });
      toast({ title: 'Success', description: 'Promise recorded successfully.' });
      setShowPromiseDialog(false);
      setPromiseDate(new Date().toISOString().split('T')[0]);
      setPromiseDescription('');
      refetchPromises();
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || error.response?.data?.error || '';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: serverMsg || 'Failed to record promise',
      });
    } finally {
      setIsSavingPromise(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedSubscriber || !user) return;
    if (!receiveMethod) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a payment type.' });
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/billing/payments', {
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: receiveAmount,
        paymentDate: receiveDate,
        method: receiveMethod,
        transactionId: receiveTransactionId.trim(),
        transactionType: receiveMethod,
        collectorId: user.id,
      });
      if (selectedPromiseId) {
        const linkedPromise = subscriberPromises.find(p => p.id === selectedPromiseId);
        if (linkedPromise) {
          await api.put(`/billing/promises/${linkedPromise.id}`, {
            ...linkedPromise,
            status: 'completed',
          });
        }
      }
      toast({ title: 'Success', description: 'Payment received and recorded.' });
      setShowReceiveDialog(false);
      refetchPayments();
      refetchPromises();
      queryClient.invalidateQueries({ queryKey: ['admin/connections'] });
      setReceiveAmount(0);
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setReceiveMethod('cash');
      setReceiveComment('');
      setReceiveTransactionId('');
      setSelectedPromiseId(null);
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || error.response?.data?.error || '';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: serverMsg || 'Failed to record payment',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/billing/payments/${id}`);
      toast({ title: 'Deleted', description: 'Payment entry deleted.' });
      refetchPayments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete entry.' });
    }
  };

  const handleDeletePromise = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promise?')) return;
    try {
      await api.delete(`/billing/promises/${id}`);
      toast({ title: 'Deleted', description: 'Promise entry deleted.' });
      refetchPromises();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete promise.' });
    }
  };

  const handleReceivePromise = (promise: PromiseEntry) => {
    setSelectedPromiseId(promise.id);
    setReceiveAmount(promise.amount);
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setReceiveMethod('cash');
    setReceiveComment('');
    setReceiveTransactionId('');
    setShowReceiveDialog(true);
  };

  const handleEditOpen = (payment: Payment) => {
    setEditPayment(payment);
    setEditAmount(payment.amount);
    setEditComment('');
    setEditTransactionId(payment.transactionId || '');
    setEditTransactionType(payment.transactionType || payment.method || '');
    setShowEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editPayment) return;
    setIsSaving(true);
    try {
      await api.put(`/billing/payments/${editPayment.id}`, {
        ...editPayment,
        amount: editAmount,
        transactionId: editTransactionId.trim(),
        transactionType: editTransactionType || editPayment.method,
      });
      toast({ title: 'Updated', description: 'Payment entry updated.' });
      setShowEditDialog(false);
      setEditPayment(null);
      refetchPayments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update entry.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSubscribers) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading subscribers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriber Collections</h1>
          <p className="text-sm text-muted-foreground">Receive payments from subscribers. Recovery Officer: <span className="font-medium text-foreground">{recoveryOfficerName}</span></p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Subscribers</p>
              <p className="text-2xl font-bold">{totalSubscribers}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">PKR {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <Link href="/collection/pending-subscribers" className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-accent/50 cursor-pointer block">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Subscribers</p>
              <p className="text-2xl font-bold">{totalPendingSubscribers}</p>
            </div>
          </div>
        </Link>
        <Link href="/collection/pending-subscribers" className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-accent/50 cursor-pointer block">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">PKR {totalPendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </Link>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <div className="p-4 border-b">
          <div className="max-w-md space-y-2">
            <Label>Search Subscriber</Label>
            <div className="relative">
              <Input
                value={subscriberSearch}
                onChange={(e) => {
                  setSubscriberSearch(e.target.value);
                  if (selectedSubscriberId) setSelectedSubscriberId(null);
                }}
                placeholder="Type subscriber ID or name..."
              />
              {filteredSubscribers.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                  {filteredSubscribers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm border-b last:border-b-0"
                      onClick={() => {
                        setSelectedSubscriberId(c.id);
                        setSubscriberSearch('');
                      }}
                    >
                      <span className="font-mono font-medium">{c.internetId || c.id?.slice(0, 8)}</span>
                      <span className="ml-2 text-muted-foreground">{c.name}</span>
                      {(c.cell || c.mobile) && (
                        <span className="ml-2 text-xs text-muted-foreground">• {c.cell || c.mobile}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedSubscriber && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <span className="font-mono">{selectedSubscriber.internetId || selectedSubscriber.id?.slice(0, 8)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{selectedSubscriber.name}</span>
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={() => setSelectedSubscriberId(null)}
                  >
                    ×
                  </button>
                </Badge>
              </div>
            )}
          </div>
        </div>

        {selectedSubscriber ? (
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Subscriber ID</Label>
                  <p className="font-medium font-mono text-sm">{selectedSubscriber.id?.slice(0, 8) || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedSubscriber.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Internet ID</Label>
                  <p className="font-medium">{selectedSubscriber.internetId || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <p className="font-medium">{selectedSubscriber.mobile || selectedSubscriber.cell || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="font-medium truncate" title={selectedSubscriber.address}>{selectedSubscriber.address || '---'}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Package Fee</Label>
                  <p className="font-semibold">PKR {packageFee.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Received This Month</Label>
                  <p className="font-semibold">PKR {totalReceivedThisMonth.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remaining</Label>
                  <p className="font-semibold">
                    {displayRemaining === 0 ? (
                      <span className="text-emerald-600">PKR 0</span>
                    ) : (
                      <span className="text-amber-600">PKR {displayRemaining.toLocaleString()}</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Advance Amount</Label>
                  <p className="font-semibold">
                    {advanceAmount > 0 ? (
                      <span className="text-blue-600">PKR {advanceAmount.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">PKR 0</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>
                    {advanceAmount > 0 ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Advance</Badge>
                    ) : remainingAmount > 0 ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Pending</Badge>
                    ) : packageFee > 0 ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Full</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">---</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span>Receiving as: <span className="font-medium text-foreground">{recoveryOfficerName}</span></span>
              </div>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setShowPromiseDialog(true)}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Make Promise
              </Button>
              <Button onClick={() => { setSelectedPromiseId(null); setReceiveAmount(displayRemaining); setReceiveMethod('cash'); setReceiveTransactionId(''); setShowReceiveDialog(true); }} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                <DollarSign className="mr-2 h-4 w-4" />
                Receive Payment
              </Button>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">{selectedSubscriber.name}&apos;s Payment History</h3>
              {isLoadingPayments || isLoadingPromises ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : subscriberPayments.length === 0 && subscriberPromises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payment history found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Bill #</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Subscriber ID</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Name</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Address</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Month/Year</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Payment Type</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Transaction ID</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Amount</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Date</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Comment</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Status</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Received By</TableHead>
                        <TableHead className="py-1 px-1.5 w-[110px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriberPromises.map((promise) => (
                        <TableRow key={promise.id} className="bg-amber-50/40 dark:bg-amber-950/20">
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            <span className="font-mono text-amber-700 dark:text-amber-400">PROMISE</span>
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{promise.subscriberId?.slice(0, 8) || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{selectedSubscriber.name}</TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[100px] truncate" title={selectedSubscriber.address}>{selectedSubscriber.address || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {promise.promiseDate ? new Date(promise.promiseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700">Promise</Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap text-muted-foreground">---</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-medium whitespace-nowrap">PKR {promise.amount.toLocaleString()}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {promise.promiseDate ? new Date(promise.promiseDate).toLocaleDateString() : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[80px] truncate" title={promise.description}>{promise.description || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            <Badge variant="default" className="bg-amber-500 text-[10px] px-1.5 py-0">Pending</Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{promise.collectorName || recoveryOfficerName}</TableCell>
                          <TableCell className="py-1.5 px-1.5">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700" onClick={() => handleReceivePromise(promise)}>
                                <DollarSign className="mr-1 h-3 w-3" />
                                Receive
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setPrintPromise(promise);
                                    setPrintPayment(null);
                                    setPrintFormatChoice('a4');
                                    setIsPrintDialogOpen(true);
                                  }}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Print Slip
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setPrintPromise(promise);
                                    setPrintPayment(null);
                                    setPrintFormatChoice('thermal');
                                    setIsPrintDialogOpen(true);
                                  }}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate Slip
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeletePromise(promise.id)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {subscriberPayments.map((payment, index) => (
                        <TableRow key={payment.id}>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{payment.billNo || index + 1}</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{payment.subscriberId?.slice(0, 8) || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{payment.subscriberName}</TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[100px] truncate" title={selectedSubscriber.address}>{selectedSubscriber.address || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 capitalize whitespace-nowrap">{payment.method || 'cash'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{payment.transactionId || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-medium whitespace-nowrap">PKR {payment.amount.toLocaleString()}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[80px] truncate">---</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            <Badge variant="default" className="bg-green-600 text-[10px] px-1.5 py-0">Paid</Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{recoveryOfficerName}</TableCell>
                          <TableCell className="py-1.5 px-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditOpen(payment)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setPrintPromise(null);
                                  setPrintPayment(payment);
                                  setPrintFormatChoice('a4');
                                  setIsPrintDialogOpen(true);
                                }}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setPrintPromise(null);
                                  setPrintPayment(payment);
                                  setPrintFormatChoice('thermal');
                                  setIsPrintDialogOpen(true);
                                }}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(payment.id)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
              <h3 className="text-lg font-medium mb-2">No Subscriber Selected</h3>
              <p>Search and select a subscriber to receive payments and view history.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Receive Payment Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={(open) => { setShowReceiveDialog(open); if (!open) setSelectedPromiseId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
            {selectedPromiseId && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                Fulfilling a pending promise (amount pre-filled).
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input value={selectedSubscriber?.mobile || selectedSubscriber?.cell || '---'} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Received By</Label>
              <Input value={recoveryOfficerName} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Package Fee (PKR)</Label>
              <Input
                value={packageFee.toLocaleString()}
                readOnly
                className="font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label>Remaining (PKR)</Label>
              <Input
                value={displayRemaining.toLocaleString()}
                readOnly
                className="font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
              />
            </div>
            {receiveAmount > 0 && (
              <div className={`rounded-md border px-3 py-2 text-sm font-medium ${
                afterPaymentRemaining === 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : receiveAmount > displayRemaining
                    ? 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
              }`}>
                {afterPaymentRemaining === 0
                  ? `Fully Paid — PKR ${receiveAmount.toLocaleString()} covers the remaining`
                  : receiveAmount > displayRemaining
                    ? `Advance — PKR ${(receiveAmount - displayRemaining).toLocaleString()} extra will be credited`
                    : `After Payment — PKR ${afterPaymentRemaining.toLocaleString()} remaining`
                }
              </div>
            )}
            <div className="space-y-1">
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Type</Label>
              <SearchableSelect
                value={receiveMethod}
                onValueChange={(v) => {
                  if (v) {
                    setReceiveMethod(v);
                    if (v !== 'cash' && selectedSubscriber?.transactionId) {
                      setReceiveTransactionId(selectedSubscriber.transactionId);
                    } else {
                      setReceiveTransactionId('');
                    }
                  }
                }}
                options={mergedPaymentOptions}
                placeholder="Select payment type..."
                searchPlaceholder="Search payment type..."
                allowClear={false}
              />
            </div>
            {receiveMethod !== 'cash' && (
              <div className="space-y-1">
                <Label>Transaction ID</Label>
                <Input
                  value={receiveTransactionId}
                  onChange={(e) => setReceiveTransactionId(e.target.value)}
                  readOnly={!!selectedSubscriber?.transactionId}
                  placeholder={selectedSubscriber?.transactionId ? "Auto-filled from subscriber" : "Enter transaction ID / reference number"}
                />
                {selectedSubscriber?.transactionId && (
                  <p className="text-[11px] text-muted-foreground">Auto-filled from subscriber record</p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label>Comment</Label>
              <Textarea
                value={receiveComment}
                onChange={(e) => setReceiveComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-semibold">Entry Preview</Label>
              <div className="overflow-x-auto rounded-md border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Bill #</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Subscriber ID</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Name</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Address</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Month/Year</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Payment Type</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Transaction ID</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Amount</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Date</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Comment</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Status</TableHead>
                      <TableHead className="py-1 px-1.5 whitespace-nowrap">Received By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">NEW</TableCell>
                      <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{selectedSubscriber?.id?.slice(0, 8) || '---'}</TableCell>
                      <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{selectedSubscriber?.name || '---'}</TableCell>
                      <TableCell className="py-1.5 px-1.5 max-w-[100px] truncate" title={selectedSubscriber?.address}>{selectedSubscriber?.address || '---'}</TableCell>
                      <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                        {receiveDate ? new Date(receiveDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '---'}
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 capitalize whitespace-nowrap">{receiveMethod || 'cash'}</TableCell>
                      <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{receiveTransactionId || '---'}</TableCell>
                      <TableCell className="py-1.5 px-1.5 font-medium whitespace-nowrap">PKR {receiveAmount.toLocaleString()}</TableCell>
                      <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                        {receiveDate ? new Date(receiveDate).toLocaleDateString() : '---'}
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 max-w-[80px] truncate" title={receiveComment}>{receiveComment || '---'}</TableCell>
                      <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                        <Badge variant="default" className="bg-green-600 text-[10px] px-1.5 py-0">Paid</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{recoveryOfficerName}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <Button
              onClick={handleReceive}
              disabled={isSaving || !receiveAmount || !receiveMethod}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Receive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Make Promise Dialog */}
      <Dialog open={showPromiseDialog} onOpenChange={setShowPromiseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make a Promise</DialogTitle>
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
              <Label>Promise Date</Label>
              <Input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={promiseDescription}
                onChange={(e) => setPromiseDescription(e.target.value)}
                placeholder="e.g. I will pay the outstanding amount on this date."
                rows={3}
              />
            </div>
            <Button
              onClick={handlePromiseSave}
              disabled={isSavingPromise}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 text-white hover:from-cyan-600 hover:to-teal-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSavingPromise && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Promise
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditPayment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bill #</Label>
                <Input value={editPayment?.billNo?.toString() || '---'} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Subscriber</Label>
                <Input value={editPayment?.subscriberName || ''} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Transaction ID</Label>
              <Input
                value={editTransactionId}
                onChange={(e) => setEditTransactionId(e.target.value)}
                placeholder="Enter transaction ID / reference number"
              />
            </div>
            <div className="space-y-1">
              <Label>Transaction Type</Label>
              <SearchableSelect
                value={editTransactionType}
                onValueChange={(v) => { if (v) setEditTransactionType(v); }}
                options={filteredTransactionTypes.map(t => ({ id: t.paymentChannel || t.transaction, name: t.paymentChannel || t.transaction }))}
                placeholder="Select transaction type (Cash, Easypaisa, or bank name)..."
                searchPlaceholder="Search transaction type..."
                allowClear={false}
              />
            </div>
            <Button
              onClick={handleEditSave}
              disabled={isSaving || !editAmount || !editTransactionType}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubscriberPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintPayment(null); setPrintPromise(null); }}
        payment={printPayment}
        promise={printPromise}
        company={currentCompany}
        subscriberName={selectedSubscriber?.name}
        collectorName={recoveryOfficerName}
        initialTab={printFormatChoice}
      />
    </div>
  );
}