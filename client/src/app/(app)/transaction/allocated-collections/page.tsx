'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useUser } from '@/hooks/use-user';
import { CalendarIcon, Loader2, MoreHorizontal, PlusCircle, ClipboardPen, Users, DollarSign } from 'lucide-react';

import type { Subscriber, Payment } from '@/lib/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years;
}

export default function AllocatedCollectionsPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const { user } = useUser();

  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [showNewAmountDialog, setShowNewAmountDialog] = useState(false);
  const [showPromiseDateDialog, setShowPromiseDateDialog] = useState(false);

  // New Amount form state
  const [newAmountCollectionType, setNewAmountCollectionType] = useState('cable');
  const [newAmountPaymentType, setNewAmountPaymentType] = useState('monthly');
  const [newAmountPackageFee, setNewAmountPackageFee] = useState(0);
  const [newAmountNetAmount, setNewAmountNetAmount] = useState(0);
  const [newAmountMonth, setNewAmountMonth] = useState(new Date().getMonth().toString());
  const [newAmountYear, setNewAmountYear] = useState(new Date().getFullYear().toString());
  const [isSavingNewAmount, setIsSavingNewAmount] = useState(false);

  // Promise Date form state
  const [promiseDate, setPromiseDate] = useState(new Date().toISOString().split('T')[0]);
  const [promiseRemarks, setPromiseRemarks] = useState('');
  const [isSavingPromise, setIsSavingPromise] = useState(false);

  const { data: subscribers = [], isLoading: isLoadingSubscribers } = useGenericQuery<Subscriber>(
    'billing/subscribers',
    companyId ?? undefined,
  );

  const subscriberOptions = useMemo(() => {
    return (subscribers as Subscriber[]).map(s => ({
      id: s.id,
      name: s.name,
      secondary: `${s.subscriber_identity} • ${s.phone}`,
    }));
  }, [subscribers]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return (subscribers as Subscriber[]).find(s => s.id === selectedSubscriberId) || null;
  }, [subscribers, selectedSubscriberId]);

  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useGenericQuery<Payment>(
    selectedSubscriberId ? 'billing/payments' : null,
    selectedSubscriberId ? companyId ?? undefined : undefined,
  );

  const allocatedPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    const all = payments as Payment[];
    return all.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  // Auto-fill net amount when package fee changes
  useEffect(() => {
    if (newAmountPackageFee > 0) {
      setNewAmountNetAmount(newAmountPackageFee);
    }
  }, [newAmountPackageFee]);

  const totalSubscribers = useMemo(() => {
    if (!Array.isArray(subscribers)) return 0;
    return subscribers.length;
  }, [subscribers]);

  const totalPayments = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.length;
  }, [payments]);

  const totalAmount = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const handleCreatePayment = async () => {
    if (!selectedSubscriber) return;
    setIsSavingNewAmount(true);
    try {
      await api.post('/billing/payments', {
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: newAmountNetAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'cash',
        collectorId: user?.id || undefined,
      });
      toast({ title: 'Success', description: 'Payment recorded successfully.' });
      setShowNewAmountDialog(false);
      refetchPayments();
      setNewAmountCollectionType('cable');
      setNewAmountPaymentType('monthly');
      setNewAmountPackageFee(0);
      setNewAmountNetAmount(0);
      setNewAmountMonth(new Date().getMonth().toString());
      setNewAmountYear(new Date().getFullYear().toString());
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || error.response?.data?.error || '';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: serverMsg || 'Failed to record payment',
      });
    } finally {
      setIsSavingNewAmount(false);
    }
  };

  const handleSavePromiseDate = async () => {
    if (!selectedSubscriber) return;
    setIsSavingPromise(true);
    try {
      await api.post('/billing/payments', {
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: 0,
        paymentDate: promiseDate,
        method: 'cash',
        collectorId: user?.id || undefined,
      });
      toast({ title: 'Success', description: 'Promise date recorded successfully.' });
      setShowPromiseDateDialog(false);
      refetchPayments();
      setPromiseDate(new Date().toISOString().split('T')[0]);
      setPromiseRemarks('');
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || error.response?.data?.error || '';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: serverMsg || 'Failed to save promise date',
      });
    } finally {
      setIsSavingPromise(false);
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
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
          <ClipboardPen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Allocated Collections</h1>
          <p className="text-sm text-muted-foreground">View and manage allocated collections.</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subscribers</p>
              <p className="text-2xl font-bold">{totalSubscribers}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <ClipboardPen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Payments</p>
              <p className="text-2xl font-bold">{totalPayments}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">PKR {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <div className="p-4 border-b">
          <div className="max-w-md">
            <SearchableSelect
              value={selectedSubscriberId}
              onValueChange={setSelectedSubscriberId}
              options={subscriberOptions}
              placeholder="Search and select a subscriber..."
              searchPlaceholder="Type to search by name, internet ID, or phone..."
              label="Select Subscriber"
            />
          </div>
        </div>

        {selectedSubscriber ? (
          <CardContent className="p-0">
            {/* Subscriber Details */}
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Customer ID</Label>
                  <p className="font-medium truncate">{selectedSubscriber.id?.slice(0, 8) || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium truncate">{selectedSubscriber.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Internet ID</Label>
                  <p className="font-medium truncate">{selectedSubscriber.subscriber_identity || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="font-medium truncate">{selectedSubscriber.installationAddress || '---'}</p>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Monthly / Yearly</Label>
                  <p className="font-medium capitalize">{selectedSubscriber.billingCycle || 'Monthly'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Type</Label>
                  <p className="font-medium capitalize">Cash</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Collection Type</Label>
                  <p className="font-medium capitalize">{selectedSubscriber.packageName || 'Cable'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Net Amount</Label>
                  <p className="font-medium">Rs. {selectedSubscriber.balance.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={selectedSubscriber.status === 'active' ? 'default' : 'secondary'}>
                    {selectedSubscriber.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-b flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Label className="text-xs text-muted-foreground">Balance</Label>
                <Input
                  type="number"
                  value={selectedSubscriber.balance}
                  readOnly
                  className="font-medium"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => setShowPromiseDateDialog(true)} className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Promise Date
                </Button>
                <Button onClick={() => setShowNewAmountDialog(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Amount
                </Button>
              </div>
            </div>

            {/* Allocated Collection History */}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Allocated Collection History</h3>
              {isLoadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allocatedPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No collection history found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill Number</TableHead>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Month / Year</TableHead>
                        <TableHead>Payment Type</TableHead>
                        <TableHead>Collection Type</TableHead>
                        <TableHead>Receive Amount</TableHead>
                        <TableHead>Receiving Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocatedPayments.map((payment, idx) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{selectedSubscriber.id?.slice(0, 8) || '---'}</TableCell>
                          <TableCell>{new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell className="capitalize">Monthly</TableCell>
                          <TableCell>{selectedSubscriber.packageName || 'Cable'}</TableCell>
                          <TableCell>Rs. {payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">Paid</Badge>
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
              <p>Search and select a subscriber to view their allocated collections.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* New Amount Dialog */}
      <Dialog open={showNewAmountDialog} onOpenChange={setShowNewAmountDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Customer ID</Label>
                <Input value={selectedSubscriber?.id?.slice(0, 8) || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={selectedSubscriber?.name || ''} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Internet ID</Label>
              <Input value={selectedSubscriber?.subscriber_identity || ''} readOnly />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Collection Type</Label>
                <Select value={newAmountCollectionType} onValueChange={setNewAmountCollectionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cable">Cable</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Type</Label>
                <Select value={newAmountPaymentType} onValueChange={setNewAmountPaymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Package Fee</Label>
                <Input
                  type="number"
                  value={newAmountPackageFee}
                  onChange={(e) => setNewAmountPackageFee(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Net Amount</Label>
                <Input
                  type="number"
                  value={newAmountNetAmount}
                  onChange={(e) => setNewAmountNetAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Month</Label>
                <Select value={newAmountMonth} onValueChange={setNewAmountMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, i) => (
                      <SelectItem key={i} value={i.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Select value={newAmountYear} onValueChange={setNewAmountYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getYearOptions().map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleCreatePayment}
              disabled={isSavingNewAmount || !newAmountNetAmount}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSavingNewAmount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promise Date Dialog */}
      <Dialog open={showPromiseDateDialog} onOpenChange={setShowPromiseDateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Promise Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Customer ID</Label>
                <Input value={selectedSubscriber?.id?.slice(0, 8) || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
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
              <Label>Remarks</Label>
              <Input
                value={promiseRemarks}
                onChange={(e) => setPromiseRemarks(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
            <Button
              onClick={handleSavePromiseDate}
              disabled={isSavingPromise}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSavingPromise && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
