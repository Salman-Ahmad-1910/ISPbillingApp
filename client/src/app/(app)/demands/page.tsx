'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HandHelping, Inbox, Loader2, PlusCircle, Send, ShieldCheck, Trash2 } from 'lucide-react';

import api from '@/lib/api';
import { useCompany } from '@/context/company-context';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { PERMISSION_DEFS } from '@/lib/permission-pages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';

// A permission demand: a user asks the admin they work under for permissions.
type DemandPage = { id: string; name: string };
type Demand = {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  accountType: string;
  recipientId?: string | null;
  recipientName?: string;
  pages: DemandPage[];
  platform: 'web' | 'mobile' | 'both';
  priority: 'normal' | 'urgent';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  reply?: string;
  respondedByName?: string;
  respondedAt?: string | null;
  createdAt: string;
};

// Roles that can see / answer demands of their company.
const ADMIN_ROLES = ['admin', 'owner'];
// Roles that usually create other accounts and so receive demands.
const RECEIVER_ROLES = ['admin', 'owner', 'manager', 'dealer', 'sub_dealer'];
const DESCRIPTION_MIN = 10;

const PLATFORM_LABEL: Record<string, string> = { web: 'Website', mobile: 'Mobile app', both: 'Website & mobile' };

function roleLabel(role: string | undefined): string {
  return String(role || '-').replace(/_/g, ' ');
}

function fmtDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '-' : format(d, 'dd MMM yyyy, hh:mm a');
}

function StatusBadge({ status }: { status: Demand['status'] }) {
  if (status === 'approved') return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
}

function PriorityBadge({ priority }: { priority: Demand['priority'] }) {
  return priority === 'urgent'
    ? <Badge variant="destructive">Urgent</Badge>
    : <Badge variant="outline">Normal</Badge>;
}

function PagesList({ pages }: { pages: DemandPage[] }) {
  if (!pages || pages.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {pages.map((p) => (
        <span key={p.id} className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.name || p.id}</span>
      ))}
    </div>
  );
}

export default function DemandsPage() {
  const { companyId } = useCompany();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const role = String(user?.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(role);

  const { data: myDemands = [], isLoading: loadingMine } = useQuery({
    queryKey: ['demands/mine', companyId],
    enabled: !!companyId,
    queryFn: async () => (await api.get('/demands/mine', { params: { companyId } })).data?.data as Demand[] ?? [],
  });
  const { data: received = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['demands/received', companyId],
    enabled: !!companyId,
    queryFn: async () => (await api.get('/demands/received', { params: { companyId } })).data?.data as Demand[] ?? [],
  });

  const showReceived = RECEIVER_ROLES.includes(role) || received.length > 0;
  const pendingReceived = received.filter((d) => d.status === 'pending').length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['demands/mine'] });
    queryClient.invalidateQueries({ queryKey: ['demands/received'] });
  };

  // ---- Add demand form ----
  const [formOpen, setFormOpen] = useState(false);
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [platform, setPlatform] = useState<'web' | 'mobile' | 'both'>('both');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const pageItems = useMemo(
    () => PERMISSION_DEFS.map((p) => ({ id: p.id, name: p.name, secondary: p.module })),
    [],
  );

  const openForm = () => {
    setPageIds([]);
    setPlatform('both');
    setPriority('normal');
    setDescription('');
    setFormOpen(true);
  };

  const sendDemand = async () => {
    if (description.trim().length < DESCRIPTION_MIN) {
      toast({ variant: 'destructive', title: 'Explain your demand', description: `Please write at least ${DESCRIPTION_MIN} characters.` });
      return;
    }
    setSending(true);
    try {
      const pages = pageIds.map((id) => ({ id, name: PERMISSION_DEFS.find((p) => p.id === id)?.name || id }));
      const res = await api.post('/demands', { pages, platform, priority, description: description.trim() }, { params: { companyId } });
      const to = res.data?.data?.recipientName;
      toast({ title: 'Demand sent', description: to ? `Your demand was sent to ${to}.` : 'Your demand was sent to your admin.' });
      setFormOpen(false);
      refresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.response?.data?.message || 'Failed to send the demand.' });
    } finally {
      setSending(false);
    }
  };

  const cancelDemand = async (d: Demand) => {
    if (!window.confirm('Cancel this demand?')) return;
    try {
      await api.delete(`/demands/${d.id}`, { params: { companyId } });
      toast({ title: 'Demand cancelled' });
      refresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.response?.data?.message || 'Failed to cancel the demand.' });
    }
  };

  // ---- View / answer ----
  const [viewing, setViewing] = useState<Demand | null>(null);
  const [viewMode, setViewMode] = useState<'mine' | 'received'>('mine');
  const [reply, setReply] = useState('');
  const [answering, setAnswering] = useState(false);

  const openView = (d: Demand, mode: 'mine' | 'received') => {
    setViewing(d);
    setViewMode(mode);
    setReply('');
  };

  const answer = async (status: 'approved' | 'rejected') => {
    if (!viewing) return;
    setAnswering(true);
    try {
      await api.put(`/demands/${viewing.id}/respond`, { status, reply: reply.trim() }, { params: { companyId } });
      toast({ title: status === 'approved' ? 'Demand approved' : 'Demand rejected' });
      setViewing(null);
      refresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.response?.data?.message || 'Failed to save the answer.' });
    } finally {
      setAnswering(false);
    }
  };

  const loadingRow = (cols: number) => (
    <TableRow><TableCell colSpan={cols} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
  );
  const emptyRow = (cols: number, text: string) => (
    <TableRow><TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">{text}</TableCell></TableRow>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 text-white shadow-sm">
            <HandHelping className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Permission Demands</h1>
            <p className="text-sm text-muted-foreground">Ask your admin for the permissions you need.</p>
          </div>
        </div>
        <Button onClick={openForm} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Demand
        </Button>
      </div>

      {/* key: re-open on the right tab once the user's role has loaded */}
      <Tabs key={isAdmin ? 'admin' : 'user'} defaultValue={isAdmin ? 'received' : 'mine'}>
        <TabsList>
          <TabsTrigger value="mine"><Send className="mr-2 h-4 w-4" />My Demands</TabsTrigger>
          {showReceived && (
            <TabsTrigger value="received">
              <Inbox className="mr-2 h-4 w-4" />Received
              {pendingReceived > 0 && <Badge className="ml-2 h-5 bg-amber-500 px-1.5 hover:bg-amber-500">{pendingReceived}</Badge>}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine">
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pages Needed</TableHead>
                    <TableHead>For</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Sent To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMine ? loadingRow(7) : myDemands.length === 0 ? emptyRow(7, 'You have not sent any demands yet. Press "Add Demand" to ask for a permission.') : myDemands.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(d.createdAt)}</TableCell>
                      <TableCell className="max-w-[260px]"><PagesList pages={d.pages} /></TableCell>
                      <TableCell className="text-xs">{PLATFORM_LABEL[d.platform] || d.platform}</TableCell>
                      <TableCell><PriorityBadge priority={d.priority} /></TableCell>
                      <TableCell className="text-sm">{d.recipientName || 'Company admin'}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="outline" size="sm" onClick={() => openView(d, 'mine')}>View</Button>
                        {d.status === 'pending' && (
                          <Button variant="ghost" size="icon" className="ml-1 h-8 w-8 text-muted-foreground hover:text-red-600" title="Cancel demand" onClick={() => cancelDemand(d)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {showReceived && (
          <TabsContent value="received">
            <Card>
              <CardContent className="overflow-x-auto pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Pages Needed</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingReceived ? loadingRow(7) : received.length === 0 ? emptyRow(7, 'No demands have been sent to you.') : received.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="whitespace-nowrap text-xs">{fmtDate(d.createdAt)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{d.requesterName}</div>
                          <div className="text-xs text-muted-foreground">{d.requesterEmail}</div>
                        </TableCell>
                        <TableCell className="capitalize">{roleLabel(d.accountType)}</TableCell>
                        <TableCell className="max-w-[260px]"><PagesList pages={d.pages} /></TableCell>
                        <TableCell><PriorityBadge priority={d.priority} /></TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant={d.status === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => openView(d, 'received')}>
                            {d.status === 'pending' ? 'Review' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Demand */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!sending) setFormOpen(o); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Demand</DialogTitle>
            <DialogDescription>Your demand goes to the admin you work under.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input readOnly value={user?.name || ''} className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label>Account Type</Label>
                <Input readOnly value={roleLabel(user?.role)} className="bg-muted capitalize" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input readOnly value={user?.email || ''} className="bg-muted" />
              </div>
            </div>

            <SearchableMultiSelect
              label="Pages / permissions needed"
              icon={ShieldCheck}
              items={pageItems}
              values={pageIds}
              onChange={setPageIds}
              placeholder="Search pages, e.g. Subscribers Collections"
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Needed On</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as 'web' | 'mobile' | 'both')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Website & mobile app</SelectItem>
                    <SelectItem value="web">Website only</SelectItem>
                    <SelectItem value="mobile">Mobile app only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as 'normal' | 'urgent')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Explain your demand *</Label>
              <Textarea
                rows={7}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Which permission do you need, and why? e.g. I collect payments in my area and need the Subscriber Collections page to receive them."
              />
              <p className="text-right text-xs text-muted-foreground">{description.length}/5000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={sending}>Cancel</Button>
            <Button
              onClick={sendDemand}
              disabled={sending || description.trim().length < DESCRIPTION_MIN}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Demand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / answer */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o && !answering) setViewing(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Demand <StatusBadge status={viewing.status} /> <PriorityBadge priority={viewing.priority} />
                </DialogTitle>
                <DialogDescription>Sent {fmtDate(viewing.createdAt)}{viewing.recipientName ? ` to ${viewing.recipientName}` : ''}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{viewing.requesterName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Account Type</p><p className="font-medium capitalize">{roleLabel(viewing.accountType)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium break-all">{viewing.requesterEmail}</p></div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Pages needed · {PLATFORM_LABEL[viewing.platform] || viewing.platform}</p>
                  <PagesList pages={viewing.pages} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Explanation</p>
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{viewing.description}</p>
                </div>

                {viewing.status !== 'pending' && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      {viewing.status === 'approved' ? 'Approved' : 'Rejected'} by {viewing.respondedByName || '-'} on {fmtDate(viewing.respondedAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{viewing.reply || 'No reply message.'}</p>
                  </div>
                )}

                {viewMode === 'received' && viewing.status === 'pending' && (
                  <div className="space-y-1">
                    <Label>Reply (optional)</Label>
                    <Textarea rows={3} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="e.g. Granted the Subscriber Collections page on mobile." />
                  </div>
                )}

                {viewMode === 'received' && isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Approving does not change permissions by itself. Grant them on{' '}
                    <Link href="/admin/roles" target="_blank" className="font-medium text-emerald-700 underline">Roles &amp; Permissions</Link>
                    {' '}for {viewing.requesterName} ({viewing.requesterEmail}).
                  </p>
                )}
              </div>
              <DialogFooter>
                {viewMode === 'received' && viewing.status === 'pending' ? (
                  <>
                    <Button variant="outline" onClick={() => answer('rejected')} disabled={answering} className="text-red-600 hover:text-red-700">Reject</Button>
                    <Button onClick={() => answer('approved')} disabled={answering} className="bg-emerald-600 text-white hover:bg-emerald-700">
                      {answering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
