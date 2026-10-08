'use client';

import { useMemo, useState } from 'react';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useCrudPermissions } from '@/hooks/usePermissions';
import { FIBER_JOINTING_PERMISSION } from '@/lib/permission-pages';
import api from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  PlusCircle,
  Search,
  HandCoins,
  ClipboardList,
  Cable,
} from 'lucide-react';

const EMPTY_SUBSCRIBER = { id: '', name: '', internetId: '', phone: '' };

function statusVariant(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'partial':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'promise':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-red-100 text-red-800 border-red-200';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'partial':
      return 'Partially Paid';
    case 'promise':
      return 'Promise to Pay';
    default:
      return 'Unpaid';
  }
}

export default function FiberJointingPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { canCreate, canUpdate } = useCrudPermissions(FIBER_JOINTING_PERMISSION);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    if (status && status !== 'all') p.status = status;
    return p;
  }, [search, status]);

  const { data: charges = [], isLoading } = useGenericQuery<any>(
    'fiber-jointing',
    companyId ?? undefined,
    Object.keys(params).length > 0 ? params : undefined,
  );

  const { data: connections = [] } = useGenericQuery<any>(
    'admin/connections',
    companyId ?? undefined,
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['fiber-jointing'] });
    queryClient.invalidateQueries({ queryKey: ['pos/sales'] });
  };

  // ---- Create dialog ----
  const [showCreate, setShowCreate] = useState(false);
  const [sel, setSel] = useState(EMPTY_SUBSCRIBER);
  const [connQuery, setConnQuery] = useState('');
  const [connOpen, setConnOpen] = useState(false);
  const [form, setForm] = useState({
    description: '',
    jointCount: '',
    materialCost: '',
    laborCost: '',
    jointingCharge: '',
    technicianName: '',
    serviceDate: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: '',
    paymentOption: 'paid',
    amountReceivedNow: '',
    paymentMethod: 'cash',
    transactionId: '',
    promiseDueDate: '',
    promiseNote: '',
  });
  const [creating, setCreating] = useState(false);

  const totalAmount = useMemo(() => {
    const v = num(form.materialCost) + num(form.laborCost) + num(form.jointingCharge);
    return Math.round(v * 100) / 100;
  }, [form.materialCost, form.laborCost, form.jointingCharge]);

  const receivedNow = useMemo(() => Math.round(num(form.amountReceivedNow) * 100) / 100, [form.amountReceivedNow]);
  const remainingAmount = Math.max(0, Math.round((totalAmount - receivedNow) * 100) / 100);

  const pickOption = (option: string) => {
    const next: any = { ...form, paymentOption: option };
    if (option === 'full') next.amountReceivedNow = String(totalAmount);
    else if (option === 'half') next.amountReceivedNow = String(Math.round((totalAmount / 2) * 100) / 100);
    else next.amountReceivedNow = '0';
    if (option !== 'promise') next.promiseDueDate = '';
    setForm(next);
  };

  const openCreate = () => {
    setSel((s: any) => s?.id ? s : EMPTY_SUBSCRIBER);
    setForm({
      ...form,
      serviceDate: new Date().toISOString().slice(0, 10),
      paymentOption: 'paid',
      paymentMethod: 'cash',
      amountReceivedNow: '',
    });
    setShowCreate(true);
  };

  const resetSubscriber = () => {
    setSel(EMPTY_SUBSCRIBER);
    setConnQuery('');
  };

  const submitCreate = async () => {
    if (!sel.id) {
      toast({ title: 'Subscriber required', description: 'Choose the subscriber for this service.', variant: 'destructive' });
      return;
    }
    if (totalAmount <= 0) {
      toast({ title: 'No charge amount', description: 'Enter a jointing service charge, material cost or labor cost.', variant: 'destructive' });
      return;
    }
    if (form.paymentOption === 'promise' && !form.promiseDueDate) {
      toast({ title: 'Promise due date required', description: 'Choose when the customer promises to pay.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      await api.post('/fiber-jointing', {
        subscriberId: sel.id,
        subscriberName: sel.name,
        internetId: sel.internetId || undefined,
        phone: sel.phone || undefined,
        description: form.description,
        jointCount: form.jointCount === '' ? 0 : parseInt(form.jointCount, 10) || 0,
        materialCost: num(form.materialCost),
        laborCost: num(form.laborCost),
        jointingCharge: num(form.jointingCharge),
        technicianName: form.technicianName,
        serviceDate: form.serviceDate,
        reason: form.reason,
        notes: form.notes,
        paymentOption: form.paymentOption,
        amountReceivedNow: receivedNow,
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId,
        promiseDueDate: form.paymentOption === 'promise' ? form.promiseDueDate : '',
        promiseNote: form.promiseNote,
      });
      toast({
        title: 'Fiber Jointing Recorded',
        description: `Charge ${fmt(totalAmount)} for ${sel.name}.${remainingAmount > 0 ? ` Remaining ${fmt(remainingAmount)}.` : ' Fully paid.'}`,
      });
      invalidate();
      setShowCreate(false);
      resetSubscriber();
      setForm((f) => ({ ...f, description: '', jointCount: '', materialCost: '', laborCost: '', jointingCharge: '', technicianName: '', reason: '', notes: '', promiseDueDate: '', promiseNote: '', transactionId: '' }));
    } catch (error: any) {
      toast({
        title: 'Failed to record',
        description: error?.response?.data?.message || error?.response?.data?.error || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // ---- Collect dialog ----
  const [collecting, setCollecting] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectMethod, setCollectMethod] = useState('cash');
  const [collectTxn, setCollectTxn] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [collectingNow, setCollectingNow] = useState(false);

  const openCollect = (row: any) => {
    setCollecting(row);
    setCollectAmount(String(row.remainingAmount || 0));
    setCollectDate(new Date().toISOString().slice(0, 10));
    setCollectMethod('cash');
    setCollectTxn('');
    setCollectNote('');
  };

  const submitCollect = async () => {
    if (!collecting) return;
    const amount = Math.round(num(collectAmount) * 100) / 100;
    if (amount <= 0) {
      toast({ title: 'Amount required', description: 'Enter a positive amount to collect.', variant: 'destructive' });
      return;
    }
    if (amount > (collecting.remainingAmount || 0)) {
      toast({ title: 'Too much', description: `Amount cannot exceed the remaining ${fmt(collecting.remainingAmount || 0)}.`, variant: 'destructive' });
      return;
    }
    setCollectingNow(true);
    try {
      await api.post(`/fiber-jointing/${collecting.id}/payment`, {
        amount,
        paymentMethod: collectMethod,
        transactionId: collectTxn,
        paymentDate: collectDate,
        note: collectNote,
      });
      toast({ title: 'Payment Collected', description: `${fmt(amount)} received from ${collecting.subscriberName}.` });
      invalidate();
      setCollecting(null);
    } catch (error: any) {
      toast({
        title: 'Collection failed',
        description: error?.response?.data?.message || error?.response?.data?.error || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setCollectingNow(false);
    }
  };

  // ---- View dialog ----
  const [viewing, setViewing] = useState<any>(null);
  const { data: detailPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['fiber-jointing', 'payments', viewing?.id, companyId],
    queryFn: async () => {
      if (!viewing?.id) return [] as any[];
      const res = await api.get(`/fiber-jointing/${viewing.id}/payments`);
      return (res.data?.data ?? []) as any[];
    },
    enabled: !!viewing?.id,
  });

  const connFiltered = useMemo(() => {
    if (!Array.isArray(connections)) return [];
    const q = connQuery.trim().toLowerCase();
    return connections.filter((s: any) => {
      const name = String(s.name || '').toLowerCase();
      const internetId = String(s.internetId || '').toLowerCase();
      const id = String(s.id || '').toLowerCase();
      return q === '' || name.includes(q) || internetId.includes(q) || id.includes(q);
    });
  }, [connections, connQuery]);

  const summary = useMemo(() => {
    let total = 0, received = 0, outstanding = 0, open = 0;
    for (const r of charges as any[]) {
      total += num(r.totalAmount);
      received += num(r.paidAmount);
      outstanding += num(r.remainingAmount);
      if (r.paymentStatus !== 'paid') open += 1;
    }
    return { total, received, outstanding, open };
  }, [charges]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Cable className="h-5 w-5" /> Fiber Jointing / Cable Repair
          </h1>
          <p className="text-sm text-muted-foreground">One-time service charges, receipts and outstanding balances.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Fiber Jointing
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading charges...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Charges</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{fmt(summary.total)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Received</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold text-emerald-600">{fmt(summary.received)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold text-red-600">{fmt(summary.outstanding)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open Jobs</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{summary.open}</CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subscriber..."
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="promise">Promise to Pay</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No fiber jointing charges yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (charges as any[]).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.subscriberName || '-'}</div>
                        {r.internetId && <div className="text-xs text-muted-foreground">{r.internetId}</div>}
                      </TableCell>
                      <TableCell>
                        {r.description || (r.jointCount > 0 ? `${r.jointCount} joints` : 'Fiber jointing')}
                      </TableCell>
                      <TableCell>{r.technicianName || '-'}</TableCell>
                      <TableCell>{r.serviceDate || '-'}</TableCell>
                      <TableCell className="text-right">{fmt(num(r.totalAmount))}</TableCell>
                      <TableCell className="text-right">{fmt(num(r.paidAmount))}</TableCell>
                      <TableCell className={`text-right ${num(r.remainingAmount) > 0 ? 'text-red-600 font-medium' : ''}`}>{fmt(num(r.remainingAmount))}</TableCell>
                      <TableCell><Badge className={statusVariant(r.paymentStatus)}>{statusLabel(r.paymentStatus)}</Badge></TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>
                            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> View
                          </Button>
                          {canUpdate && num(r.remainingAmount) > 0 && (
                            <Button variant="outline" size="sm" onClick={() => openCollect(r)}>
                              <HandCoins className="mr-1.5 h-3.5 w-3.5" /> Collect
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetSubscriber(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Fiber Jointing</DialogTitle>
            <DialogDescription>
              Record a one-time fiber jointing / cable repair service charge for a subscriber.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Subscriber</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setConnOpen((o) => !o)}
                >
                  <span className="truncate">{sel.name ? `${sel.id.slice(0, 8)} | ${sel.name}` : 'Select subscriber...'}</span>
                  <span className="text-muted-foreground">▾</span>
                </Button>
                {connOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg">
                    <div className="border-b p-2">
                      <Input
                        autoFocus
                        value={connQuery}
                        onChange={(e) => setConnQuery(e.target.value)}
                        placeholder="Search by name, internet id..."
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {connFiltered.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No subscribers found.</div>
                      ) : (
                        connFiltered.slice(0, 50).map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setSel({
                                id: s.id,
                                name: s.name || '',
                                internetId: s.internetId || '',
                                phone: s.phone || s.cell || '',
                              });
                              setConnOpen(false);
                              setConnQuery('');
                            }}
                          >
                            <span className="font-medium">{s.name || 'Unnamed'}</span>
                            <span className="text-xs text-muted-foreground">{s.id.slice(0, 8)} {s.internetId ? '· ' + s.internetId : ''} {s.phone || s.cell ? '· ' + (s.phone || s.cell) : ''}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Service Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Fiber cable repair at junction box" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Number of Joints (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.jointCount}
                  onChange={(e) => setForm({ ...form, jointCount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jointing / Service Charge</Label>
                <Input type="number" min={0} value={form.jointingCharge} onChange={(e) => setForm({ ...form, jointingCharge: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Material Cost (optional)</Label>
                <Input type="number" min={0} value={form.materialCost} onChange={(e) => setForm({ ...form, materialCost: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Labor / Technician Charge (optional)</Label>
                <Input type="number" min={0} value={form.laborCost} onChange={(e) => setForm({ ...form, laborCost: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Technician</Label>
                <Input value={form.technicianName} onChange={(e) => setForm({ ...form, technicianName: e.target.value })} placeholder="Tech name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Service Date</Label>
                <Input type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reason (optional)</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Cable cut" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes (optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any extra details..." />
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <Label className="text-xs font-medium">Payment</Label>
              <RadioGroup value={form.paymentOption} onValueChange={pickOption} className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="full" id="opt-full" /><Label htmlFor="opt-full">Paid Full</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="half" id="opt-half" /><Label htmlFor="opt-half">Paid Half (50%)</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="promise" id="opt-promise" /><Label htmlFor="opt-promise">Promise to Pay</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="unpaid" id="opt-unpaid" /><Label htmlFor="opt-unpaid">Unpaid</Label></div>
              </RadioGroup>

              <div className="grid gap-3 sm:grid-cols-2 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Amount Received Now</Label>
                  <Input
                    type="number"
                    min={0}
                    max={totalAmount}
                    value={form.amountReceivedNow}
                    onChange={(e) => setForm({ ...form, amountReceivedNow: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Payment Method</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="easypaisa">Easypaisa</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.paymentOption === 'promise' && (
                <div className="grid gap-3 sm:grid-cols-2 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Promise Due Date</Label>
                    <Input type="date" value={form.promiseDueDate} onChange={(e) => setForm({ ...form, promiseDueDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Promise Note (optional)</Label>
                    <Input value={form.promiseNote} onChange={(e) => setForm({ ...form, promiseNote: e.target.value })} placeholder="e.g. Will pay after salary" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 mt-2">
                <Label className="text-xs font-medium">Transaction Reference (optional)</Label>
                <Input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder="Bank / wallet ref" />
              </div>

              <div className="mt-2 grid gap-2 rounded-md bg-muted p-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Charge</span><span className="font-semibold">{fmt(totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Received Now</span><span className="font-semibold text-emerald-600">{fmt(receivedNow)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className={`font-semibold ${remainingAmount > 0 ? 'text-red-600' : ''}`}>{fmt(remainingAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{statusLabel(remainingAmount === 0 ? 'paid' : receivedNow > 0 ? 'partial' : form.paymentOption === 'promise' ? 'promise' : 'unpaid')}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); resetSubscriber(); }}>Cancel</Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Charge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collect dialog */}
      <Dialog open={!!collecting} onOpenChange={(open) => { if (!open) setCollecting(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              {collecting?.subscriberName} · Remaining {fmt(num(collecting?.remainingAmount))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount</Label>
              <Input
                type="number"
                min={0}
                max={collecting?.remainingAmount}
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Payment Date</Label>
                <Input type="date" value={collectDate} onChange={(e) => setCollectDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Method</Label>
                <Select value={collectMethod} onValueChange={setCollectMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                    <SelectItem value="easypaisa">Easypaisa</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Transaction Reference (optional)</Label>
              <Input value={collectTxn} onChange={(e) => setCollectTxn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Note (optional)</Label>
              <Input value={collectNote} onChange={(e) => setCollectNote(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCollecting(null)}>Cancel</Button>
            <Button onClick={submitCollect} disabled={collectingNow}>
              {collectingNow && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Collect {collecting ? fmt(Math.max(0, Math.round(num(collectAmount) * 100) / 100)) : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fiber Jointing Details</DialogTitle>
            <DialogDescription>
              {viewing?.subscriberName} {viewing?.internetId ? '· ' + viewing.internetId : ''}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{fmt(num(viewing.totalAmount))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Received</span><span className="font-semibold text-emerald-600">{fmt(num(viewing.paidAmount))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className={`font-semibold ${num(viewing.remainingAmount) > 0 ? 'text-red-600' : ''}`}>{fmt(num(viewing.remainingAmount))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusVariant(viewing.paymentStatus)}>{statusLabel(viewing.paymentStatus)}</Badge></div>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Material</dt><dd>{fmt(num(viewing.materialCost))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Labor</dt><dd>{fmt(num(viewing.laborCost))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Jointing Charge</dt><dd>{fmt(num(viewing.jointingCharge))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Joints</dt><dd>{viewing.jointCount || 0}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Technician</dt><dd>{viewing.technicianName || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{viewing.serviceDate || '-'}</dd></div>
              </dl>

              {(viewing.description || viewing.reason || viewing.notes || viewing.promiseNote) && (
                <div className="space-y-1 rounded-md border p-3 text-sm">
                  {viewing.description && <div><span className="text-muted-foreground">Service:</span> {viewing.description}</div>}
                  {viewing.reason && <div><span className="text-muted-foreground">Reason:</span> {viewing.reason}</div>}
                  {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
                  {viewing.promiseNote && <div><span className="text-muted-foreground">Promise:</span> {viewing.promiseNote} {viewing.promiseDueDate ? `(due ${viewing.promiseDueDate})` : ''}</div>}
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Payment History</div>
                {paymentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : detailPayments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No payments received yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {(detailPayments as any[]).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium">{fmt(num(p.amount))} <span className="text-muted-foreground">· {p.paymentMethod || '-'}</span></div>
                          <div className="text-xs text-muted-foreground">{p.paymentDate ? p.paymentDate.slice(0, 16) : ''} {p.collectedByName ? '· by ' + p.collectedByName : ''} {p.note ? '· ' + p.note : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function num(v: any): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function fmt(v: number): string {
  return 'PKR ' + (Math.round(v * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}