'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, MoreHorizontal, Handshake, Wallet, DollarSign, UserCheck, Trash2, Pencil, Receipt, Copy, FileText } from 'lucide-react';

import type { Dealer, DealerCollection, Area, RecoveryOfficer } from '@/lib/types';
import { CollectionPrintDialog } from './_components/collection-print-dialog';

const PAYMENT_TYPE_OPTIONS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
  { id: 'easypaisa', name: 'Easypaisa' },
  { id: 'jazzcash', name: 'JazzCash' },
];

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Unpaid' },
  { id: 'settled', name: 'Paid' },
];

export default function DealersCollectionsPage() {
  const { companyId, companies } = useCompany();
  const currentCompany = companies.find(c => c.id === companyId);
  const { toast } = useToast();
  const { user } = useUser();

  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);

  const [receiveAmount, setReceiveAmount] = useState(0);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveStatus, setReceiveStatus] = useState<'pending' | 'settled'>('pending');
  const [receiveTxType, setReceiveTxType] = useState<string>('cash');
  const [receiveComment, setReceiveComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [printCollection, setPrintCollection] = useState<DealerCollection | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printFormatChoice, setPrintFormatChoice] = useState<'a4' | 'thermal'>('a4');

  const [editCollection, setEditCollection] = useState<DealerCollection | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'settled'>('pending');

  const { data: dealers = [], isLoading: isLoadingDealers } = useGenericQuery<Dealer>(
    'dealers',
    companyId ?? undefined,
  );

  const dealerOptions = useMemo(() => {
    return (dealers as Dealer[]).map(d => ({
      id: d.id,
      name: d.name,
      secondary: `${d.phone} • ${d.cnic}`,
    }));
  }, [dealers]);

  const selectedDealer = useMemo(() => {
    if (!selectedDealerId) return null;
    return (dealers as Dealer[]).find(d => d.id === selectedDealerId) || null;
  }, [dealers, selectedDealerId]);

  const { data: collections = [], isLoading: isLoadingCollections, refetch: refetchCollections } = useGenericQuery<DealerCollection>(
    selectedDealerId ? 'dealers/collections' : null,
    selectedDealerId ? companyId ?? undefined : undefined,
  );

  const dealerCollections = useMemo(() => {
    if (!selectedDealerId) return [];
    const all = collections as DealerCollection[];
    return all.filter(c => c.dealerId === selectedDealerId);
  }, [collections, selectedDealerId]);

  const totalDealers = useMemo(() => {
    if (!Array.isArray(dealers)) return 0;
    return dealers.length;
  }, [dealers]);

  const totalCollections = useMemo(() => {
    if (!Array.isArray(collections)) return 0;
    return collections.length;
  }, [collections]);

  const totalAmount = useMemo(() => {
    if (!Array.isArray(collections)) return 0;
    return collections.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
  }, [collections]);

  const totalWalletBalance = useMemo(() => {
    if (!Array.isArray(dealers)) return 0;
    return (dealers as Dealer[]).reduce((sum: number, d) => sum + (Number(d.walletBalance) || 0), 0);
  }, [dealers]);

  const { data: areas = [] } = useGenericQuery<Area>(
    'network/areas',
    companyId ?? undefined,
  );

  const { data: recoveryOfficers = [] } = useGenericQuery<RecoveryOfficer>(
    'admin/recovery-officers',
    companyId ?? undefined,
  );

  // Resolve the recovery officer by the dealer's assigned areaId
  const recoveryOfficerName = useMemo(() => {
    if (!selectedDealer) return user?.name || '---';
    if (selectedDealer.areaId) {
      const area = (areas as Area[]).find(a => a.id === selectedDealer.areaId);
      if (area && area.recoveryOfficerId) {
        const officer = (recoveryOfficers as RecoveryOfficer[]).find(
          o => o.id === area.recoveryOfficerId
        );
        if (officer) return officer.name;
      }
    }
    // Fallback: match by the logged-in user's recovery officer record
    const officer = (recoveryOfficers as RecoveryOfficer[]).find(
      o => o.id === user?.id
    );
    return officer?.name || user?.name || '---';
  }, [selectedDealer, areas, recoveryOfficers, user]);

  const handleReceive = async () => {
    if (!selectedDealer || !user) return;
    setIsSaving(true);
    try {
      await api.post('/dealers/collections', {
        dealerId: selectedDealer.id,
        dealerName: selectedDealer.name,
        dealerAddress: selectedDealer.address || '',
        amount: receiveAmount,
        collectionDate: receiveDate,
        settlementStatus: receiveStatus,
        transactionType: receiveTxType,
        comment: receiveComment,
        receivedById: user.id,
        receivedByName: user.name,
      });
      toast({ title: 'Success', description: 'Payment received and recorded.' });
      setShowReceiveDialog(false);
      refetchCollections();
      setReceiveAmount(0);
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setReceiveStatus('pending');
      setReceiveTxType('cash');
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
      await api.delete(`/dealers/collections/${id}`);
      toast({ title: 'Deleted', description: 'Collection entry deleted.' });
      refetchCollections();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete entry.' });
    }
  };

  const handleEditOpen = (col: DealerCollection) => {
    setEditCollection(col);
    setEditAmount(col.amount);
    setEditComment(col.comment || '');
    setEditStatus(col.settlementStatus as 'pending' | 'settled');
    setShowEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editCollection) return;
    setIsSaving(true);
    try {
      await api.put(`/dealers/collections/${editCollection.id}`, {
        ...editCollection,
        amount: editAmount,
        comment: editComment,
        settlementStatus: editStatus,
      });
      toast({ title: 'Updated', description: 'Collection entry updated.' });
      setShowEditDialog(false);
      setEditCollection(null);
      refetchCollections();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update entry.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (col: DealerCollection) => {
    const newStatus = col.settlementStatus === 'settled' ? 'pending' : 'settled';
    try {
      await api.put(`/dealers/collections/${col.id}`, {
        ...col,
        settlementStatus: newStatus,
      });
      toast({ title: 'Updated', description: `Status changed to ${newStatus}.` });
      refetchCollections();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  if (isLoadingDealers) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dealers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm">
          <Handshake className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dealer Collections</h1>
          <p className="text-sm text-muted-foreground">Receive payments from dealers. Recovery Officer: <span className="font-medium text-foreground">{recoveryOfficerName}</span></p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Dealers</p>
              <p className="text-2xl font-bold">{totalDealers}</p>
            </div>
          </div>
        </div>
        <div className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
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
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">PKR {totalAmount.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">PKR {totalWalletBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <div className="p-4 border-b">
          <div className="max-w-md">
            <SearchableSelect
              value={selectedDealerId}
              onValueChange={setSelectedDealerId}
              options={dealerOptions}
              placeholder="Search and select a dealer..."
              searchPlaceholder="Type to search by name, phone, or CNIC..."
              label="Select Dealer"
            />
          </div>
        </div>

        {selectedDealer ? (
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                  <Label className="text-xs text-muted-foreground">CNIC</Label>
                  <p className="font-medium">{selectedDealer.cnic || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="font-medium truncate max-w-[200px]" title={selectedDealer.address}>{selectedDealer.address || '---'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Balance</Label>
                  <p className="font-medium">PKR {selectedDealer.walletBalance.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remaining</Label>
                  <p className={`font-medium ${(selectedDealer.remainingAmount || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    PKR {(selectedDealer.remainingAmount || 0).toLocaleString()}
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
              <h3 className="text-lg font-semibold mb-4">{selectedDealer.name}&apos;s Payment History</h3>
              {isLoadingCollections ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : dealerCollections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payment history found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Bill #</TableHead>
                        <TableHead className="py-1 px-1.5 whitespace-nowrap">Dealer ID</TableHead>
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
                      {dealerCollections.map((col) => (
                        <TableRow key={col.id}>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{col.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-mono whitespace-nowrap">{col.dealerId?.slice(0, 8) || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{col.dealerName}</TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[100px] truncate" title={col.dealerAddress}>{col.dealerAddress || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {col.collectionDate ? new Date(col.collectionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 capitalize whitespace-nowrap">{col.transactionType || 'cash'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 font-medium whitespace-nowrap">PKR {col.amount.toLocaleString()}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            {col.collectionDate ? new Date(col.collectionDate).toLocaleDateString() : '---'}
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 max-w-[80px] truncate" title={col.comment}>{col.comment || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                            <Badge variant={col.settlementStatus === 'settled' ? 'default' : 'secondary'} className={col.settlementStatus === 'settled' ? 'bg-green-600 text-[10px] px-1.5 py-0' : 'text-[10px] px-1.5 py-0'}>
                              {col.settlementStatus === 'settled' ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-1.5 whitespace-nowrap">{col.receivedByName || '---'}</TableCell>
                          <TableCell className="py-1.5 px-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditOpen(col)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(col)}>
                                  <Receipt className="mr-2 h-4 w-4" />
                                  {col.settlementStatus === 'settled' ? 'Mark Unpaid' : 'Mark Paid'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setPrintCollection(col);
                                  setPrintFormatChoice('a4');
                                  setIsPrintDialogOpen(true);
                                }}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setPrintCollection(col);
                                  setPrintFormatChoice('thermal');
                                  setIsPrintDialogOpen(true);
                                }}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(col.id)} className="text-red-600">
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
              <h3 className="text-lg font-medium mb-2">No Dealer Selected</h3>
              <p>Search and select a dealer to receive payments and view history.</p>
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
                <Label>Dealer ID</Label>
                <Input value={selectedDealer?.id?.slice(0, 8) || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Dealer Name</Label>
                <Input value={selectedDealer?.name || ''} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={selectedDealer?.address || '---'} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Wallet Balance</Label>
                <Input value={`PKR ${selectedDealer?.walletBalance?.toLocaleString() || '0'}`} readOnly />
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
                value={receiveTxType}
                onValueChange={(v) => { if (v) setReceiveTxType(v); }}
                options={PAYMENT_TYPE_OPTIONS}
                placeholder="Select payment type..."
                searchPlaceholder="Search payment type..."
                allowClear={false}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <SearchableSelect
                value={receiveStatus}
                onValueChange={(v) => { if (v) setReceiveStatus(v as 'pending' | 'settled'); }}
                options={STATUS_OPTIONS}
                placeholder="Select status..."
                searchPlaceholder="Search status..."
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
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditCollection(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Bill #</Label>
                <Input value={editCollection?.id?.slice(0, 8).toUpperCase() || ''} readOnly />
              </div>
              <div className="space-y-1">
                <Label>Dealer</Label>
                <Input value={editCollection?.dealerName || ''} readOnly />
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
              <Label>Status</Label>
              <SearchableSelect
                value={editStatus}
                onValueChange={(v) => { if (v) setEditStatus(v as 'pending' | 'settled'); }}
                options={STATUS_OPTIONS}
                placeholder="Select status..."
                searchPlaceholder="Search status..."
                allowClear={false}
              />
            </div>
            <div className="space-y-1">
              <Label>Comment</Label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
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

      <CollectionPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => { setIsPrintDialogOpen(false); setPrintCollection(null); }}
        collection={printCollection}
        company={currentCompany}
        receivedByName={recoveryOfficerName}
        initialTab={printFormatChoice}
      />
    </div>
  );
}
