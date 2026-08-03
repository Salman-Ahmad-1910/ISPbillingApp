'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Inbox, FileText, Plus, Eye, Pencil, Trash2, Loader2, X, MoreHorizontal, Send, Search, MessageCircle, Bell } from 'lucide-react';
import type { MessageTemplate, Connection, Dealer, RecoveryOfficer, Staff } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

const DEFAULT_PARAMS = ['name', 'cableAmount', 'internetAmount', 'received', 'balance', 'date', 'bill'];

const SEND_CATEGORIES = [
  { value: 'subscribers', label: 'Subscribers', sendTo: 'Subscriber' },
  { value: 'dealers', label: 'Dealers', sendTo: 'Dealer' },
  { value: 'recovery', label: 'Recovery Officers', sendTo: 'Recovery Officer' },
  { value: 'staff', label: 'Staff', sendTo: 'Staff' },
];

function formatVal(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isNaN(v) ? '' : v.toLocaleString();
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
      const d = new Date(v.trim());
      if (!Number.isNaN(d.getTime())) return format(d, 'dd MMM yyyy');
    }
    return v;
  }
  return String(v);
}

function getEntityPhone(entity: any): string {
  return entity.mobileNo || entity.mobile || entity.cell || entity.phone || entity.contactPhone || entity.secondaryPhone || '';
}

function buildValues(entity: any, category: string): Record<string, string> {
  const map: Record<string, string> = {};
  Object.entries(entity).forEach(([k, v]) => {
    const val = formatVal(v);
    map[k] = val;
    map[k.toLowerCase()] = val;
  });
  const name = map['name'] || '';
  map['name'] = name;
  const phone = getEntityPhone(entity);
  map['phone'] = phone;
  map['mobile'] = phone;
  map['mobileNo'] = phone;
  map['cnic'] = map['cnic'] || map['nic'] || '';
  map['address'] = map['address'] || map['installationAddress'] || '';

  if (category === 'subscribers') {
    map['cableAmount'] = formatVal(entity.amount);
    map['internetAmount'] = formatVal(entity.packageInternet);
    map['received'] = formatVal(entity.amount);
    map['balance'] = formatVal(entity.remainingAmount ?? entity.amount);
    map['bill'] = formatVal(entity.amount);
    map['date'] = map['date'] || formatVal(entity.rechargeDate || entity.lastPaymentDate || entity.createdAt);
  } else if (category === 'dealers') {
    map['amount'] = formatVal(entity.walletBalance);
    map['received'] = formatVal(entity.walletBalance);
    map['balance'] = formatVal(entity.remainingAmount ?? entity.walletBalance);
    map['bill'] = formatVal(entity.walletBalance);
    map['date'] = map['date'] || formatVal(entity.lastPaymentDate || entity.createdAt);
  } else if (category === 'recovery') {
    map['amount'] = formatVal(entity.collected);
    map['received'] = formatVal(entity.collected);
    map['balance'] = formatVal(entity.target);
    map['bill'] = formatVal(entity.target);
    map['date'] = map['date'] || formatVal(entity.createdAt);
  } else if (category === 'staff') {
    map['date'] = map['date'] || formatVal(entity.appointedDate || entity.createdAt);
  }
  return map;
}

function fillTemplate(message: string, entity: any, category: string): string {
  const values = buildValues(entity, category);
  return message.replace(/\{([^}]+)\}/g, (_, p: string) => values[p] ?? values[p.toLowerCase()] ?? '');
}

export default function NewMessagesPage() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateParams, setTemplateParams] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  const [availableParams, setAvailableParams] = useState<string[]>(DEFAULT_PARAMS);
  const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
  const [newParamInput, setNewParamInput] = useState('');

  const [sendTarget, setSendTarget] = useState<MessageTemplate | null>(null);
  const [sendCategory, setSendCategory] = useState('');
  const [sendSearch, setSendSearch] = useState('');
  const [sendSelectedIds, setSendSelectedIds] = useState<Set<string>>(new Set());
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState(false);

  const { data: templates = [], isLoading, refetch: refetchTemplates } = useGenericQuery<MessageTemplate>('messages/templates', companyId ?? undefined);
  const { data: connections = [] } = useGenericQuery<Connection>('admin/connections', companyId ?? undefined);
  const { data: dealers = [] } = useGenericQuery<Dealer>('dealers', companyId ?? undefined);
  const { data: recoveryOfficers = [] } = useGenericQuery<RecoveryOfficer>('admin/recovery-officers', companyId ?? undefined);
  const { data: staff = [] } = useGenericQuery<Staff>('hr/staff', companyId ?? undefined);

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateTitle('');
    setTemplateMessage('');
    setTemplateParams('');
    setAvailableParams(DEFAULT_PARAMS);
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateMessage(template.message);
    setTemplateParams(template.parameters || '');
    const existing = (template.parameters || '').split(',').map(p => p.trim()).filter(Boolean);
    setAvailableParams(Array.from(new Set([...DEFAULT_PARAMS, ...existing])));
    setShowTemplateDialog(true);
  };

  const selectedParams = useMemo(
    () => templateParams.split(',').map(p => p.trim()).filter(Boolean),
    [templateParams]
  );

  const handleSelectParam = (value: string) => {
    if (value && !selectedParams.includes(value)) {
      setTemplateParams(prev => prev ? `${prev}, ${value}` : value);
    }
  };

  const removeSelectedParam = (param: string) => {
    setTemplateParams(
      prev => prev.split(',').map(p => p.trim()).filter(Boolean).filter(p => p !== param).join(', ')
    );
  };

  const addAvailableParam = () => {
    const p = newParamInput.trim();
    if (!p) return;
    if (availableParams.includes(p)) {
      toast({ variant: 'destructive', title: 'Error', description: `Parameter "${p}" already exists.` });
      return;
    }
    setAvailableParams(prev => [...prev, p]);
    setNewParamInput('');
  };

  const removeAvailableParam = (param: string) => {
    setAvailableParams(prev => prev.filter(p => p !== param));
    setTemplateParams(
      prev => prev.split(',').map(p => p.trim()).filter(Boolean).filter(p => p !== param).join(', ')
    );
  };

  const handleTemplateSave = async () => {
    if (!templateTitle.trim() || !templateMessage.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and message are required.' });
      return;
    }
    setIsSavingTemplate(true);
    try {
      if (editingTemplate) {
        await api.put(`/messages/templates/${editingTemplate.id}`, {
          ...editingTemplate,
          title: templateTitle.trim(),
          message: templateMessage.trim(),
          parameters: templateParams.trim(),
        });
        toast({ title: 'Updated', description: 'Message template updated.' });
      } else {
        await api.post('/messages/templates', {
          title: templateTitle.trim(),
          message: templateMessage.trim(),
          parameters: templateParams.trim(),
        });
        toast({ title: 'Added', description: 'Message template added.' });
      }
      setShowTemplateDialog(false);
      refetchTemplates();
    } catch (error: any) {
      const serverMsg = error.response?.data?.message || error.response?.data?.error || '';
      toast({ variant: 'destructive', title: 'Error', description: serverMsg || 'Failed to save template.' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template: MessageTemplate) => {
    if (!confirm(`Delete template "${template.title}"?`)) return;
    try {
      await api.delete(`/messages/templates/${template.id}`);
      toast({ title: 'Deleted', description: 'Message template deleted.' });
      refetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete template.' });
    }
  };

  const entityList = useMemo(() => {
    if (sendCategory === 'subscribers') return connections;
    if (sendCategory === 'dealers') return dealers;
    if (sendCategory === 'recovery') return recoveryOfficers;
    if (sendCategory === 'staff') return staff;
    return [];
  }, [sendCategory, connections, dealers, recoveryOfficers, staff]);

  const currentCategory = SEND_CATEGORIES.find((c) => c.value === sendCategory);

  const visibleEntities = useMemo(() => {
    if (!sendSearch.trim()) return entityList;
    const q = sendSearch.trim().toLowerCase();
    if (/^[0-9]/.test(q)) {
      return entityList.filter((e) =>
        String(e.id || '').toLowerCase().startsWith(q) ||
        String((e as any).internetId || '').toLowerCase().startsWith(q)
      );
    }
    return entityList.filter((e) => String(e.name || '').toLowerCase().startsWith(q));
  }, [entityList, sendSearch]);

  const allVisibleSelected = visibleEntities.length > 0 && visibleEntities.every((e) => sendSelectedIds.has(e.id));

  const toggleAllVisible = (checked: boolean) => {
    setSendSelectedIds((prev) => {
      const next = new Set(prev);
      visibleEntities.forEach((e) => (checked ? next.add(e.id) : next.delete(e.id)));
      return next;
    });
  };

  const toggleEntity = (id: string) => {
    setSendSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSendDialog = (template: MessageTemplate) => {
    setSendTarget(template);
    setSendCategory('');
    setSendSearch('');
    setSendSelectedIds(new Set());
    setSendViaWhatsApp(false);
  };

  const closeSendDialog = () => {
    setSendTarget(null);
    setSendCategory('');
    setSendSearch('');
    setSendSelectedIds(new Set());
    setSendViaWhatsApp(false);
  };

  const handleSendTemplate = async (template: MessageTemplate) => {
    const cat = SEND_CATEGORIES.find((c) => c.value === sendCategory);
    if (!cat) return;
    const targets = entityList.filter((e) => sendSelectedIds.has(e.id));
    if (targets.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one recipient.' });
      return;
    }
    setIsSendingNow(true);
    try {
      for (const ent of targets) {
        const filled = fillTemplate(template.message || '', ent, cat.value);
        await api.post(`/messages?companyId=${companyId}`, {
          entityId: ent.id,
          name: ent.name,
          mobileNo: getEntityPhone(ent),
          messageType: template.title,
          messageText: filled,
          sendTo: cat.sendTo,
          status: sendViaWhatsApp ? 'whatsapp_draft' : 'draft',
          companyId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['messages', companyId] });
      toast({ title: 'Success', description: `${targets.length} message(s) added to ${sendViaWhatsApp ? 'WhatsApp Draft' : 'Draft'} Messages.` });
      closeSendDialog();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to send messages.' });
    } finally {
      setIsSendingNow(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading message templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-sm">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Messages</h1>
          <p className="text-sm text-muted-foreground">Create and manage message templates</p>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-teal-500/30 to-transparent" />

      {/* Message Templates */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2 text-white shadow-sm">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Message Templates</h2>
                <p className="text-xs text-muted-foreground">Dynamic parameters inside curly braces e.g. {`{name}, {balance}`} are filled when sending</p>
              </div>
            </div>
            <Button onClick={openAddTemplate} className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm transition-all duration-300 hover:shadow-md">
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </div>

          <div className="min-w-0 overflow-x-auto rounded-md border [&_th]:px-2 [&_th]:py-2.5 [&_td]:px-2 [&_td]:py-2.5">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                          <FileText className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No message templates found</p>
                        <p className="text-xs text-muted-foreground/60">Click Add Template to create one.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id} className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm">
                      <TableCell className="font-medium text-muted-foreground">{template.id.slice(0, 6).toUpperCase()}</TableCell>
                      <TableCell className="font-medium truncate" title={template.title}>{template.title}</TableCell>
                      <TableCell className="max-w-[360px]">
                        <p className="truncate text-xs text-muted-foreground" title={template.message}>{template.message}</p>
                      </TableCell>
                      <TableCell>
                        {template.parameters
                          ? template.parameters.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                              <span key={p} className="mr-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">{"{" + p + "}"}</span>
                            ))
                          : <span className="text-xs text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 transition-all duration-300 hover:scale-110">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="data-[highlighted]:text-emerald-600" onClick={() => openSendDialog(template)}>
                              <Send className="mr-2 h-4 w-4 text-emerald-600" /> Send
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                              <Eye className="mr-2 h-4 w-4 text-blue-600" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditTemplate(template)}>
                              <Pencil className="mr-2 h-4 w-4 text-amber-600" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive data-[highlighted]:text-red-600" onClick={() => handleDeleteTemplate(template)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Message Template' : 'Add Message Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="e.g. COLLECTION, UsersCredentail"
              />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                placeholder="e.g. Dear {name}, Thanks for payment, Cable:{cableAmount} Internet:{internetAmount}..."
                rows={6}
              />
            </div>
            <div className="space-y-1">
              <Label>Parameters</Label>
              <div className="flex gap-2">
                <Select value="" onValueChange={handleSelectParam}>
                  <SelectTrigger className="w-full border-muted-foreground/20">
                    <SelectValue placeholder="Select parameters..." />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {availableParams.filter(p => !selectedParams.includes(p)).map((p) => (
                      <SelectItem key={p} value={p}>{"{" + p + "}"}</SelectItem>
                    ))}
                    {availableParams.filter(p => !selectedParams.includes(p)).length === 0 && (
                      <SelectItem value="__none__" disabled>No parameters available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setParamsDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Parameters
                </Button>
              </div>
              {selectedParams.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedParams.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                      {"{" + p + "}"}
                      <button type="button" onClick={() => removeSelectedParam(p)} className="hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Select parameters from the dropdown or manage the list via Add Parameters.</p>
            </div>
            <Button
              onClick={handleTemplateSave}
              disabled={isSavingTemplate}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {isSavingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTemplate ? 'Save Changes' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Parameters Dialog */}
      <Dialog open={paramsDialogOpen} onOpenChange={setParamsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Parameters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newParamInput}
                onChange={(e) => setNewParamInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAvailableParam(); } }}
                placeholder="e.g. name, balance, bill"
              />
              <Button type="button" variant="outline" onClick={addAvailableParam}>Add</Button>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Parameters shown in the dropdown</p>
              {availableParams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No parameters yet. Add one above.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {availableParams.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                      {"{" + p + "}"}
                      <button type="button" onClick={() => removeAvailableParam(p)} className="hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setParamsDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={!!sendTarget} onOpenChange={(open) => { if (!open && !isSendingNow) closeSendDialog(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
          </DialogHeader>
          {sendTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-sm"><span className="text-muted-foreground">Template:</span> <span className="font-medium">{sendTarget.title}</span></p>
                <p className="mt-1 rounded-md bg-muted p-2 text-xs text-muted-foreground">{sendTarget.message}</p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-muted-foreground/20 bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  {sendViaWhatsApp
                    ? <MessageCircle className="h-5 w-5 text-green-600" />
                    : <Bell className="h-5 w-5 text-blue-600" />}
                  <div>
                    <p className="text-sm font-medium">{sendViaWhatsApp ? 'Send via WhatsApp' : 'Send as Notification (SMS)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {sendViaWhatsApp ? 'Messages will be added to WhatsApp Draft Messages' : 'Messages will be added to Draft Messages'}
                    </p>
                  </div>
                </div>
                <Switch checked={sendViaWhatsApp} onCheckedChange={setSendViaWhatsApp} />
              </div>
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select value={sendCategory} onValueChange={(value) => { setSendCategory(value); setSendSearch(''); setSendSelectedIds(new Set()); }}>
                  <SelectTrigger className="w-full max-w-[260px] border-muted-foreground/20">
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent portal={false}>
                    {SEND_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {sendCategory && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} aria-label="Select all" />
                      <span className="text-sm">Select All ({visibleEntities.length})</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{sendSelectedIds.size} selected</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={sendSearch} onChange={(e) => setSendSearch(e.target.value)} placeholder={`Search ${currentCategory?.label.toLowerCase() || 'recipients'}...`} className="pl-8 border-muted-foreground/20" />
                  </div>
                  <ScrollArea className="h-[300px] rounded-md border">
                    {visibleEntities.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">No {currentCategory?.label.toLowerCase() || 'recipients'} found.</p>
                    ) : (
                      <div className="divide-y">
                        {visibleEntities.map((ent) => (
                          <div key={ent.id} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50">
                            <Checkbox checked={sendSelectedIds.has(ent.id)} onCheckedChange={() => toggleEntity(ent.id)} aria-label={`Select ${ent.name}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{ent.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{getEntityPhone(ent) || '-'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeSendDialog} disabled={isSendingNow}>Cancel</Button>
                <Button onClick={() => handleSendTemplate(sendTarget)} disabled={sendSelectedIds.size === 0 || isSendingNow} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all duration-300 hover:shadow-md">
                  {isSendingNow && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Send className="h-4 w-4" />
                  Send ({sendSelectedIds.size})
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-xs">Title</span>
                <p className="font-semibold">{previewTemplate.title}</p>
              </div>
              {previewTemplate.parameters && (
                <div>
                  <span className="text-muted-foreground text-xs">Parameters</span>
                  <div className="mt-1">
                    {previewTemplate.parameters.split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                      <span key={p} className="mr-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">{"{" + p + "}"}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Message</p>
                <p>{previewTemplate.message || 'No message content'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
