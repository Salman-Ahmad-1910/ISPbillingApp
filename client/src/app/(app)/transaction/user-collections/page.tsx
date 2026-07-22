'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useUser } from '@/hooks/use-user';
import { Loader2, MoreHorizontal, Wallet, DollarSign, UserCheck, Trash2, Pencil, Copy, FileText, Users } from 'lucide-react';

import type { Connection, Payment, Area, RecoveryOfficer } from '@/lib/types';
import { SubscriberPrintDialog } from './_components/subscriber-print-dialog';

const PAYMENT_TYPE_OPTIONS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
  { id: 'online', name: 'Online' },
  { id: 'dealer', name: 'Dealer' },
];

const STATUS_OPTIONS = [
  { id: 'paid', name: 'Paid' },
  { id: 'pending', name: 'Unpaid' },
];

export default function SubscriberCollectionsPage() {
  const { companyId, companies } = useCompany();
  const currentCompany = companies.find(c => c.id === companyId);
  const { toast } = useToast();
  const { user } = useUser();

  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);

  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveMethod, setReceiveMethod] = useState<string>('cash');
  const [receiveComment, setReceiveComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [printPayment, setPrintPayment] = useState<Payment | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printFormatChoice, setPrintFormatChoice] = useState<'a4' | 'thermal'>('a4');

  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editComment, setEditComment] = useState('');

  const { data: connections = [], isLoading: isLoadingSubscribers } = useGenericQuery<Connection>(
    'admin/connections',
    companyId ?? undefined,
  );

  const subscriberOptions = useMemo(() => {
    return (connections as Connection[]).map(c => ({
      id: c.id,
      name: c.name,
      secondary: `${c.cell || ''} ${c.mobile || ''}`.trim() || c.address || '',
    }));
  }, [connections]);

  const selectedSubscriber = useMemo(() => {
    if (!selectedSubscriberId) return null;
    return (connections as Connection[]).find(c => c.id === selectedSubscriberId) || null;
  }, [connections, selectedSubscriberId]);

  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useGenericQuery<Payment>(
    selectedSubscriberId ? 'billing/payments' : null,
    selectedSubscriberId ? companyId ?? undefined : undefined,
  );

  const subscriberPayments = useMemo(() => {
    if (!selectedSubscriberId) return [];
    const all = payments as Payment[];
    return all.filter(p => p.subscriberId === selectedSubscriberId);
  }, [payments, selectedSubscriberId]);

  const totalSubscribers = useMemo(() => {
    if (!Array.isArray(connections)) return 0;
    return connections.length;
  }, [connections]);

  const totalCollections = useMemo(() => {
    if (!Array.isArray(payments)) return 0;
    return payments.length;
  }, [payments]);

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

  const totalRemainingAmount = useMemo(() => {
    if (!Array.isArray(connections)) return 0;
    return (connections as Connection[]).reduce((sum: number, c) => sum + (Number(c.remainingAmount) || Number(c.sameAmount) || 0), 0);
  }, [connections]);

  const handleReceive = async () => {
    if (!selectedSubscriber || !user) return;
    setIsSaving(true);
    try {
      await api.post('/billing/payments', {
        subscriberId: selectedSubscriber.id,
        subscriberName: selectedSubscriber.name,
        amount: receiveAmount,
        paymentDate: receiveDate,
        method: receiveMethod,
        collectorId: user.id,
      });
      toast({ title: 'Success', description: 'Payment received and recorded.' });
      setShowReceiveDialog(false);
      refetchPayments();
      setReceiveAmount(0);
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setReceiveMethod('cash');
      setReceiveComment('');
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

  const handleEditOpen = (payment: Payment) => {
    setEditPayment(payment);
    setEditAmount(payment.amount);
    setEditComment('');
    setShowEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editPayment) return;
    setIsSaving(true);
    try {
      await api.put(`/billing/payments/${editPayment.id}`, {
        ...editPayment,
        amount: editAmount,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Collections</p>
              <p className="text-2xl font-bold">{totalCollections}</p>
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
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Remaining Amount</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">PKR {totalRemainingAmount.toLocaleString()}</p>
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
              searchPlaceholder="Type to search by name, CNIC, or phone..."
              label="Select Subscriber"
            />
          </div>
        </div>

        {selectedSubscriber ? (
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                <span>Receiving as: <span className="font-medium text-foreground">{recoveryOfficerName}</span></span>
              </div>
              <div className="flex-1" />
              <Button onClick={() => setShowReceiveDialog(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
                <DollarSign className="mr-2 h-4 w-4" />
                Receive Payment
              </Button>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">{selectedSubscriber.name}&apos;s Payment History</h3>
              {isLoadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : subscriberPayments.length === 0 ? (
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
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Received</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Pay Date</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Comment</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Status</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Received By</TableHead>
                        <TableHead className="py-1 px-1.5 w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriberPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{payment.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{payment.subscriberId?.slice(0, 8) || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{payment.subscriberName}</TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[100px] truncate" title={selectedSubscriber.address}>{selectedSubscriber.address || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 capitalize whitespace-nowrap">{payment.method || 'cash'}</TableCell>
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
                                  setPrintPayment(payment);
                                  setPrintFormatChoice('a4');
                                  setIsPrintDialogOpen(true);
                                }}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
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
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
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
              <div className="space-y-1">
                <Label>Amount (PKR)</Label>
                <Input value={selectedSubscriber?.amount?.toLocaleString() || '0'} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Received By</Label>
              <Input value={recoveryOfficerName} readOnly />
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
                onValueChange={(v) => { if (v) setReceiveMethod(v); }}
                options={PAYMENT_TYPE_OPTIONS}
                placeholder="Select payment type..."
                searchPlaceholder="Search payment type..."
                allowClear={false}
              />
            </div>
            <div className="space-y-1">
              <Label>Comment</Label>
              <Textarea
                value={receiveComment}
                onChange={(e) => setReceiveComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleReceive}
              disabled={isSaving || !receiveAmount}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Receive
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
                <Input value={editPayment?.id?.slice(0, 8).toUpperCase() || ''} readOnly />
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
            <Button
              onClick={handleEditSave}
              disabled={isSaving || !editAmount}
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
        onClose={() => { setIsPrintDialogOpen(false); setPrintPayment(null); }}
        payment={printPayment}
        company={currentCompany}
        subscriberName={selectedSubscriber?.name}
        collectorName={recoveryOfficerName}
        initialTab={printFormatChoice}
      />
    </div>
  );
}
